import type { Database } from '../services/storage/database';
import type { MonumentDeltaResponse } from '../services/heritageApi';
import { haversineMeters } from '../services/vector/similarity';
import type {
  GeoFix,
  HeritageMonument,
  HeritageSeedBundle,
  HeritageSource,
  HeritageWalkingTour,
  HeritageZone,
} from '../types/heritage';

// Loaded with require so TypeScript does not infer a literal type for the 1.4 MB corpus.
const seedBundle: HeritageSeedBundle = require('../data/heritageSeed.json');

const SEED_VERSION_KEY = 'monuments.seedVersion';
const SYNC_RESOURCE = 'monuments';

export class MonumentRepository {
  private readonly cache = new Map<string, HeritageMonument>();

  constructor(private readonly db: Database | null) {}

  get corpusVersion(): string {
    return seedBundle.version;
  }

  get embeddingModel(): HeritageSeedBundle['embeddingModel'] {
    return seedBundle.embeddingModel;
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      seedBundle.monuments.forEach((m) => this.cache.set(m.id, m));
      return;
    }
    const seeded = await this.db.getFirstAsync<{ value: string }>('SELECT value FROM kv_store WHERE key = ?', SEED_VERSION_KEY);
    if (seeded?.value !== seedBundle.version) {
      await this.db.withExclusiveTransactionAsync(async (txn) => {
        for (const monument of seedBundle.monuments) {
          // Never overwrite a row that a later delta sync has already refreshed.
          await txn.runAsync(
            `INSERT INTO monuments (id, zone_id, payload, corpus_version, updated_at, deleted)
             VALUES (?, ?, ?, ?, ?, 0)
             ON CONFLICT(id) DO UPDATE SET zone_id = excluded.zone_id, payload = excluded.payload,
               corpus_version = excluded.corpus_version, updated_at = excluded.updated_at, deleted = 0
             WHERE monuments.updated_at <= excluded.updated_at`,
            monument.id,
            monument.zoneId,
            JSON.stringify(monument),
            seedBundle.version,
            seedBundle.generatedAt,
          );
        }
        await txn.runAsync(
          'INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
          SEED_VERSION_KEY,
          seedBundle.version,
          new Date().toISOString(),
        );
      });
    }
    await this.reloadCache();
  }

  private async reloadCache(): Promise<void> {
    if (!this.db) return;
    const rows = await this.db.getAllAsync<{ payload: string }>('SELECT payload FROM monuments WHERE deleted = 0');
    this.cache.clear();
    for (const row of rows) {
      const monument = JSON.parse(row.payload) as HeritageMonument;
      this.cache.set(monument.id, monument);
    }
  }

  getAll(): HeritageMonument[] {
    return [...this.cache.values()].sort(
      (a, b) => a.zoneId.localeCompare(b.zoneId) || a.walkingTourStop.sequence - b.walkingTourStop.sequence,
    );
  }

  getById(id: string): HeritageMonument | undefined {
    return this.cache.get(id);
  }

  getByZone(zoneId: string): HeritageMonument[] {
    return this.getAll().filter((m) => m.zoneId === zoneId);
  }

  getZones(): HeritageZone[] {
    return seedBundle.zones;
  }

  getZone(zoneId: string): HeritageZone | undefined {
    return seedBundle.zones.find((z) => z.zoneId === zoneId);
  }

  getSources(): HeritageSource[] {
    return seedBundle.sources;
  }

  getBundledWalkingTours(): HeritageWalkingTour[] {
    return seedBundle.walkingTours;
  }

  search(query: string): HeritageMonument[] {
    const q = query.trim().toLowerCase();
    if (!q) return this.getAll();
    return this.getAll().filter(
      (m) =>
        m.names.en.toLowerCase().includes(q) ||
        m.names.romanized.toLowerCase().includes(q) ||
        m.names.ne.includes(query.trim()) ||
        (m.subZone ?? '').toLowerCase().includes(q),
    );
  }

  getNearby(fix: GeoFix, radiusM: number): { monument: HeritageMonument; distanceM: number }[] {
    return this.getAll()
      .map((monument) => ({ monument, distanceM: haversineMeters(fix, monument.geo) }))
      .filter((entry) => entry.distanceM <= radiusM)
      .sort((a, b) => a.distanceM - b.distanceM);
  }

  async getLastSyncedAt(): Promise<string | null> {
    if (!this.db) return null;
    const row = await this.db.getFirstAsync<{ last_synced_at: string | null }>(
      'SELECT last_synced_at FROM sync_state WHERE resource = ?',
      SYNC_RESOURCE,
    );
    return row?.last_synced_at ?? null;
  }

  /** Applies a server delta: upserts changed monuments, soft-deletes removed ones, advances the sync cursor. */
  async applyDelta(delta: MonumentDeltaResponse): Promise<{ upserted: number; deleted: number }> {
    if (!this.db) {
      delta.monuments.forEach((m) => this.cache.set(m.id, m));
      delta.deletedIds.forEach((id) => this.cache.delete(id));
      return { upserted: delta.monuments.length, deleted: delta.deletedIds.length };
    }
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      for (const monument of delta.monuments) {
        await txn.runAsync(
          `INSERT INTO monuments (id, zone_id, payload, corpus_version, updated_at, deleted)
           VALUES (?, ?, ?, ?, ?, 0)
           ON CONFLICT(id) DO UPDATE SET zone_id = excluded.zone_id, payload = excluded.payload,
             corpus_version = excluded.corpus_version, updated_at = excluded.updated_at, deleted = 0`,
          monument.id,
          monument.zoneId,
          JSON.stringify(monument),
          delta.corpusVersion,
          delta.serverTime,
        );
      }
      for (const id of delta.deletedIds) {
        await txn.runAsync('UPDATE monuments SET deleted = 1, updated_at = ? WHERE id = ?', delta.serverTime, id);
      }
      await txn.runAsync(
        'INSERT INTO sync_state (resource, last_synced_at, cursor) VALUES (?, ?, ?) ON CONFLICT(resource) DO UPDATE SET last_synced_at = excluded.last_synced_at, cursor = excluded.cursor',
        SYNC_RESOURCE,
        delta.serverTime,
        delta.corpusVersion,
      );
    });
    await this.reloadCache();
    return { upserted: delta.monuments.length, deleted: delta.deletedIds.length };
  }
}
