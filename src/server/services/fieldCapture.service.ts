import { createHash } from 'crypto';
import type {
  CaptureAngle,
  CaptureSubmissionStatus,
  LightingTag,
} from '../types/heritage';

export interface FieldCaptureInput {
  clientCaptureId: string;
  monumentCode?: string | null;
  zoneCode?: string | null;
  userId?: string | null;
  angle: CaptureAngle;
  photoUri: string;
  voiceNoteUri?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  altitudeM?: number | null;
  gpsAccuracyM?: number | null;
  headingDeg?: number | null;
  lightingTag?: LightingTag;
  notes?: string | null;
  capturedAt: string | Date;
}

export interface FieldCaptureRecord extends FieldCaptureInput {
  id: string;
  capturedAt: Date;
  lightingTag: LightingTag;
  status: CaptureSubmissionStatus;
  attempts: number;
  nextAttemptAt: Date | null;
  lastError: string | null;
  payloadHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertResult {
  record: FieldCaptureRecord;
  created: boolean;
  updated: boolean;
  duplicate: boolean;
}

function payloadHash(input: FieldCaptureInput): string {
  const canonical = JSON.stringify({
    clientCaptureId: input.clientCaptureId,
    monumentCode: input.monumentCode ?? null,
    zoneCode: input.zoneCode ?? null,
    angle: input.angle,
    photoUri: input.photoUri,
    voiceNoteUri: input.voiceNoteUri ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    altitudeM: input.altitudeM ?? null,
    gpsAccuracyM: input.gpsAccuracyM ?? null,
    headingDeg: input.headingDeg ?? null,
    lightingTag: input.lightingTag ?? 'OVERCAST',
    notes: input.notes ?? null,
    capturedAt: new Date(input.capturedAt).toISOString(),
  });
  return createHash('sha256').update(canonical).digest('hex');
}

function newId(): string {
  return `fcs_${createHash('sha1').update(`${Date.now()}_${Math.random()}`).digest('hex').slice(0, 16)}`;
}

/**
 * In-memory / unit-testable FieldCaptureSubmission store.
 * Batch upserts are idempotent on `clientCaptureId`:
 * - identical payload → no-op duplicate
 * - same id, different payload while still PENDING → merge update
 * - same id after UPLOADED → reject mutation, return existing
 */
export class FieldCaptureService {
  private readonly byClientId = new Map<string, FieldCaptureRecord>();

  get(clientCaptureId: string): FieldCaptureRecord | undefined {
    return this.byClientId.get(clientCaptureId);
  }

  list(status?: CaptureSubmissionStatus): FieldCaptureRecord[] {
    return [...this.byClientId.values()]
      .filter((r) => !status || r.status === status)
      .sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
  }

  upsert(input: FieldCaptureInput): UpsertResult {
    const hash = payloadHash(input);
    const existing = this.byClientId.get(input.clientCaptureId);

    if (!existing) {
      const now = new Date();
      const record: FieldCaptureRecord = {
        id: newId(),
        clientCaptureId: input.clientCaptureId,
        monumentCode: input.monumentCode ?? null,
        zoneCode: input.zoneCode ?? null,
        userId: input.userId ?? null,
        angle: input.angle,
        photoUri: input.photoUri,
        voiceNoteUri: input.voiceNoteUri ?? null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        altitudeM: input.altitudeM ?? null,
        gpsAccuracyM: input.gpsAccuracyM ?? null,
        headingDeg: input.headingDeg ?? null,
        lightingTag: input.lightingTag ?? 'OVERCAST',
        notes: input.notes ?? null,
        capturedAt: new Date(input.capturedAt),
        status: 'PENDING',
        attempts: 0,
        nextAttemptAt: null,
        lastError: null,
        payloadHash: hash,
        createdAt: now,
        updatedAt: now,
      };
      this.byClientId.set(record.clientCaptureId, record);
      return { record, created: true, updated: false, duplicate: false };
    }

    if (existing.payloadHash === hash) {
      return { record: existing, created: false, updated: false, duplicate: true };
    }

    if (existing.status === 'UPLOADED' || existing.status === 'UPLOADING') {
      return { record: existing, created: false, updated: false, duplicate: true };
    }

    const updated: FieldCaptureRecord = {
      ...existing,
      monumentCode: input.monumentCode ?? existing.monumentCode,
      zoneCode: input.zoneCode ?? existing.zoneCode,
      userId: input.userId ?? existing.userId,
      angle: input.angle,
      photoUri: input.photoUri,
      voiceNoteUri: input.voiceNoteUri ?? existing.voiceNoteUri,
      latitude: input.latitude ?? existing.latitude,
      longitude: input.longitude ?? existing.longitude,
      altitudeM: input.altitudeM ?? existing.altitudeM,
      gpsAccuracyM: input.gpsAccuracyM ?? existing.gpsAccuracyM,
      headingDeg: input.headingDeg ?? existing.headingDeg,
      lightingTag: input.lightingTag ?? existing.lightingTag,
      notes: input.notes ?? existing.notes,
      capturedAt: new Date(input.capturedAt),
      payloadHash: hash,
      updatedAt: new Date(),
    };
    this.byClientId.set(updated.clientCaptureId, updated);
    return { record: updated, created: false, updated: true, duplicate: false };
  }

  /** Offline field-sync batch: upsert many captures; returns per-item results. */
  batchUpsert(inputs: FieldCaptureInput[]): {
    results: UpsertResult[];
    created: number;
    duplicates: number;
    updated: number;
  } {
    const results = inputs.map((input) => this.upsert(input));
    return {
      results,
      created: results.filter((r) => r.created).length,
      duplicates: results.filter((r) => r.duplicate).length,
      updated: results.filter((r) => r.updated).length,
    };
  }

  markUploaded(clientCaptureId: string, serverId?: string): FieldCaptureRecord {
    const existing = this.byClientId.get(clientCaptureId);
    if (!existing) {
      throw new Error(`Unknown field capture: ${clientCaptureId}`);
    }
    const updated: FieldCaptureRecord = {
      ...existing,
      id: serverId ?? existing.id,
      status: 'UPLOADED',
      lastError: null,
      nextAttemptAt: null,
      updatedAt: new Date(),
    };
    this.byClientId.set(clientCaptureId, updated);
    return updated;
  }

  size(): number {
    return this.byClientId.size;
  }

  clear(): void {
    this.byClientId.clear();
  }
}
