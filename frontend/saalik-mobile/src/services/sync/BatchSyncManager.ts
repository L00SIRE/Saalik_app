import type { FieldCaptureQueueRepository } from '../../repositories/FieldCaptureQueueRepository';
import type { CaptureBatchResult, CaptureMetadata } from '../heritageApi';
import { toCaptureMetadata } from '../heritageApi';
import type { FieldCapture } from '../../types/heritage';
import { computeBackoffMs, DEFAULT_BACKOFF, type BackoffPolicy } from './backoff';

export interface Connectivity {
  isConnected: boolean;
  isWifi: boolean;
  type: string;
}

export type SyncSkipReason = 'offline' | 'waiting_for_wifi' | 'demo_mode' | 'already_running' | 'empty_queue';

export interface SyncReport {
  status: 'completed' | 'skipped';
  reason: SyncSkipReason | null;
  attempted: number;
  uploaded: number;
  failed: number;
  startedAt: string;
  finishedAt: string;
}

export interface CaptureUploadApi {
  upsertCaptureBatch(deviceId: string, captures: CaptureMetadata[]): Promise<CaptureBatchResult[]>;
  uploadCapturePhoto(clientCaptureId: string, photoUri: string): Promise<void>;
  uploadCaptureVoiceNote(clientCaptureId: string, voiceNoteUri: string): Promise<void>;
}

export interface BatchSyncOptions {
  batchSize?: number;
  backoff?: BackoffPolicy;
  now?: () => Date;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Offline Batch Sync Manager: uploads queued field captures in batches once a
 * suitable connection is available. Metadata is upserted idempotently by
 * clientCaptureId first, so a retried batch never creates duplicates; files are
 * uploaded afterwards and failures are rescheduled with exponential backoff.
 */
export class BatchSyncManager {
  private running = false;
  private readonly batchSize: number;
  private readonly backoff: BackoffPolicy;
  private readonly now: () => Date;

  constructor(
    private readonly queue: FieldCaptureQueueRepository,
    private readonly api: CaptureUploadApi,
    private readonly getDeviceId: () => Promise<string>,
    options: BatchSyncOptions = {},
  ) {
    this.batchSize = options.batchSize ?? 10;
    this.backoff = options.backoff ?? DEFAULT_BACKOFF;
    this.now = options.now ?? (() => new Date());
  }

  get isRunning(): boolean {
    return this.running;
  }

  async run(connectivity: Connectivity, { allowCellular }: { allowCellular: boolean }): Promise<SyncReport> {
    const startedAt = this.now().toISOString();
    const skipped = (reason: SyncSkipReason): SyncReport => ({
      status: 'skipped',
      reason,
      attempted: 0,
      uploaded: 0,
      failed: 0,
      startedAt,
      finishedAt: this.now().toISOString(),
    });

    if (this.running) return skipped('already_running');
    if (!connectivity.isConnected) return skipped('offline');
    if (!connectivity.isWifi && !allowCellular) return skipped('waiting_for_wifi');

    this.running = true;
    let attempted = 0;
    let uploaded = 0;
    let failed = 0;
    try {
      const deviceId = await this.getDeviceId();
      for (;;) {
        const due = await this.queue.listDue(this.now(), this.batchSize);
        if (due.length === 0) break;
        attempted += due.length;
        const result = await this.processBatch(deviceId, due);
        uploaded += result.uploaded;
        failed += result.failed;
        if (result.uploaded === 0) break;
      }
    } finally {
      this.running = false;
    }

    if (attempted === 0) return skipped('empty_queue');
    return { status: 'completed', reason: null, attempted, uploaded, failed, startedAt, finishedAt: this.now().toISOString() };
  }

  private async scheduleRetry(capture: FieldCapture, error: unknown): Promise<void> {
    const attempt = capture.attempts + 1;
    const giveUp = attempt >= this.backoff.maxAttempts;
    const next = new Date(this.now().getTime() + computeBackoffMs(attempt, this.backoff));
    await this.queue.markRetry(capture.clientCaptureId, errorMessage(error), next, giveUp);
  }

  private async processBatch(deviceId: string, captures: FieldCapture[]): Promise<{ uploaded: number; failed: number }> {
    for (const capture of captures) {
      await this.queue.markUploading(capture);
    }

    let results: CaptureBatchResult[];
    try {
      results = await this.api.upsertCaptureBatch(deviceId, captures.map(toCaptureMetadata));
    } catch (error) {
      for (const capture of captures) await this.scheduleRetry(capture, error);
      return { uploaded: 0, failed: captures.length };
    }

    const byId = new Map(results.map((r) => [r.clientCaptureId, r]));
    let uploaded = 0;
    let failed = 0;
    for (const capture of captures) {
      const result = byId.get(capture.clientCaptureId);
      if (!result) {
        await this.scheduleRetry(capture, new Error('Server did not acknowledge this capture'));
        failed += 1;
        continue;
      }
      try {
        if (!result.photoReceived) {
          await this.api.uploadCapturePhoto(capture.clientCaptureId, capture.photoUri);
        }
        if (capture.voiceNoteUri) {
          await this.api.uploadCaptureVoiceNote(capture.clientCaptureId, capture.voiceNoteUri);
        }
        await this.queue.markUploaded(capture.clientCaptureId, result.serverId);
        uploaded += 1;
      } catch (error) {
        await this.scheduleRetry(capture, error);
        failed += 1;
      }
    }
    return { uploaded, failed };
  }
}
