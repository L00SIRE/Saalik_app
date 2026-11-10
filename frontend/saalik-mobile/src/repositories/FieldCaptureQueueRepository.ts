import type { Database } from '../services/storage/database';
import type { CaptureAngle, CaptureStatus, FieldCapture, NewFieldCapture } from '../types/heritage';

interface CaptureRow {
  client_capture_id: string;
  monument_id: string;
  zone_id: string;
  angle: string;
  photo_uri: string;
  voice_note_uri: string | null;
  latitude: number | null;
  longitude: number | null;
  altitude_m: number | null;
  gps_accuracy_m: number | null;
  heading_deg: number | null;
  lighting_tag: string;
  notes: string | null;
  captured_at: string;
  status: string;
  attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
  server_id: string | null;
  uploaded_at: string | null;
}

function fromRow(row: CaptureRow): FieldCapture {
  return {
    clientCaptureId: row.client_capture_id,
    monumentId: row.monument_id,
    zoneId: row.zone_id,
    angle: row.angle as CaptureAngle,
    photoUri: row.photo_uri,
    voiceNoteUri: row.voice_note_uri,
    latitude: row.latitude,
    longitude: row.longitude,
    altitudeM: row.altitude_m,
    gpsAccuracyM: row.gps_accuracy_m,
    headingDeg: row.heading_deg,
    lightingTag: row.lighting_tag as FieldCapture['lightingTag'],
    notes: row.notes,
    capturedAt: row.captured_at,
    status: row.status as CaptureStatus,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lastError: row.last_error,
    serverId: row.server_id,
    uploadedAt: row.uploaded_at,
  };
}

export type CaptureCounts = Record<CaptureStatus, number>;

const EMPTY_COUNTS: CaptureCounts = { PENDING: 0, UPLOADING: 0, RETRY_SCHEDULED: 0, UPLOADED: 0, FAILED: 0 };

/** Local outbox of field photographs waiting for upload. */
export class FieldCaptureQueueRepository {
  private readonly memory = new Map<string, FieldCapture>();

  constructor(private readonly db: Database | null) {}

  async enqueue(capture: NewFieldCapture): Promise<FieldCapture> {
    const record: FieldCapture = {
      ...capture,
      status: 'PENDING',
      attempts: 0,
      nextAttemptAt: null,
      lastError: null,
      serverId: null,
      uploadedAt: null,
    };
    if (!this.db) {
      this.memory.set(record.clientCaptureId, record);
      return record;
    }
    await this.db.runAsync(
      `INSERT INTO field_captures (client_capture_id, monument_id, zone_id, angle, photo_uri, voice_note_uri,
         latitude, longitude, altitude_m, gps_accuracy_m, heading_deg, lighting_tag, notes, captured_at, status, attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0)
       ON CONFLICT(client_capture_id) DO NOTHING`,
      record.clientCaptureId,
      record.monumentId,
      record.zoneId,
      record.angle,
      record.photoUri,
      record.voiceNoteUri,
      record.latitude,
      record.longitude,
      record.altitudeM,
      record.gpsAccuracyM,
      record.headingDeg,
      record.lightingTag,
      record.notes,
      record.capturedAt,
    );
    return record;
  }

  async list(status?: CaptureStatus): Promise<FieldCapture[]> {
    if (!this.db) {
      return [...this.memory.values()]
        .filter((c) => !status || c.status === status)
        .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
    }
    const rows = status
      ? await this.db.getAllAsync<CaptureRow>('SELECT * FROM field_captures WHERE status = ? ORDER BY captured_at DESC', status)
      : await this.db.getAllAsync<CaptureRow>('SELECT * FROM field_captures ORDER BY captured_at DESC');
    return rows.map(fromRow);
  }

  /** Captures ready for an upload attempt now: new ones and retries whose backoff has elapsed. */
  async listDue(now: Date, limit: number): Promise<FieldCapture[]> {
    const iso = now.toISOString();
    if (!this.db) {
      return [...this.memory.values()]
        .filter((c) => c.status === 'PENDING' || (c.status === 'RETRY_SCHEDULED' && (!c.nextAttemptAt || c.nextAttemptAt <= iso)))
        .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))
        .slice(0, limit);
    }
    const rows = await this.db.getAllAsync<CaptureRow>(
      `SELECT * FROM field_captures
       WHERE status = 'PENDING' OR (status = 'RETRY_SCHEDULED' AND (next_attempt_at IS NULL OR next_attempt_at <= ?))
       ORDER BY captured_at ASC LIMIT ?`,
      iso,
      limit,
    );
    return rows.map(fromRow);
  }

  async counts(): Promise<CaptureCounts> {
    if (!this.db) {
      const counts = { ...EMPTY_COUNTS };
      this.memory.forEach((c) => {
        counts[c.status] += 1;
      });
      return counts;
    }
    const rows = await this.db.getAllAsync<{ status: CaptureStatus; n: number }>(
      'SELECT status, COUNT(*) AS n FROM field_captures GROUP BY status',
    );
    const counts = { ...EMPTY_COUNTS };
    rows.forEach((r) => {
      counts[r.status] = r.n;
    });
    return counts;
  }

  /** Angles already captured (any status) per monument, for the collector checklist. */
  async coverageByMonument(): Promise<Map<string, Set<CaptureAngle>>> {
    const captures = await this.list();
    const coverage = new Map<string, Set<CaptureAngle>>();
    captures.forEach((c) => {
      const set = coverage.get(c.monumentId) ?? new Set<CaptureAngle>();
      set.add(c.angle);
      coverage.set(c.monumentId, set);
    });
    return coverage;
  }

  private async update(clientCaptureId: string, patch: Partial<FieldCapture>): Promise<void> {
    if (!this.db) {
      const existing = this.memory.get(clientCaptureId);
      if (existing) this.memory.set(clientCaptureId, { ...existing, ...patch });
      return;
    }
    const columns: Record<string, keyof FieldCapture> = {
      status: 'status',
      attempts: 'attempts',
      next_attempt_at: 'nextAttemptAt',
      last_error: 'lastError',
      server_id: 'serverId',
      uploaded_at: 'uploadedAt',
    };
    const sets: string[] = [];
    const values: (string | number | null)[] = [];
    Object.entries(columns).forEach(([column, key]) => {
      if (key in patch) {
        sets.push(`${column} = ?`);
        values.push((patch[key] as string | number | null | undefined) ?? null);
      }
    });
    if (sets.length === 0) return;
    await this.db.runAsync(`UPDATE field_captures SET ${sets.join(', ')} WHERE client_capture_id = ?`, ...values, clientCaptureId);
  }

  markUploading(capture: FieldCapture): Promise<void> {
    return this.update(capture.clientCaptureId, { status: 'UPLOADING', attempts: capture.attempts + 1 });
  }

  markUploaded(clientCaptureId: string, serverId: string): Promise<void> {
    return this.update(clientCaptureId, {
      status: 'UPLOADED',
      serverId,
      uploadedAt: new Date().toISOString(),
      lastError: null,
      nextAttemptAt: null,
    });
  }

  markRetry(clientCaptureId: string, error: string, nextAttemptAt: Date, giveUp: boolean): Promise<void> {
    return this.update(clientCaptureId, {
      status: giveUp ? 'FAILED' : 'RETRY_SCHEDULED',
      lastError: error,
      nextAttemptAt: giveUp ? null : nextAttemptAt.toISOString(),
    });
  }

  /** Recovers captures left mid-upload by an app restart. */
  async recoverInterrupted(): Promise<void> {
    if (!this.db) {
      this.memory.forEach((c, id) => {
        if (c.status === 'UPLOADING') this.memory.set(id, { ...c, status: 'RETRY_SCHEDULED', nextAttemptAt: null });
      });
      return;
    }
    await this.db.runAsync("UPDATE field_captures SET status = 'RETRY_SCHEDULED', next_attempt_at = NULL WHERE status = 'UPLOADING'");
  }

  async retryFailed(): Promise<void> {
    if (!this.db) {
      this.memory.forEach((c, id) => {
        if (c.status === 'FAILED') this.memory.set(id, { ...c, status: 'RETRY_SCHEDULED', attempts: 0, nextAttemptAt: null });
      });
      return;
    }
    await this.db.runAsync(
      "UPDATE field_captures SET status = 'RETRY_SCHEDULED', attempts = 0, next_attempt_at = NULL WHERE status = 'FAILED'",
    );
  }

  async remove(clientCaptureId: string): Promise<void> {
    if (!this.db) {
      this.memory.delete(clientCaptureId);
      return;
    }
    await this.db.runAsync('DELETE FROM field_captures WHERE client_capture_id = ?', clientCaptureId);
  }
}
