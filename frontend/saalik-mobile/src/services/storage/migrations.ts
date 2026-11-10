export interface Migration {
  version: number;
  name: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'offline_first_core',
    sql: `
      CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS monuments (
        id TEXT PRIMARY KEY NOT NULL,
        zone_id TEXT NOT NULL,
        payload TEXT NOT NULL,
        corpus_version TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_monuments_zone ON monuments(zone_id);

      CREATE TABLE IF NOT EXISTS marketplace_tours (
        id TEXT PRIMARY KEY NOT NULL,
        hub TEXT NOT NULL,
        meeting_lat REAL,
        meeting_lng REAL,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS field_captures (
        client_capture_id TEXT PRIMARY KEY NOT NULL,
        monument_id TEXT NOT NULL,
        zone_id TEXT NOT NULL,
        angle TEXT NOT NULL,
        photo_uri TEXT NOT NULL,
        voice_note_uri TEXT,
        latitude REAL,
        longitude REAL,
        altitude_m REAL,
        gps_accuracy_m REAL,
        heading_deg REAL,
        lighting_tag TEXT NOT NULL,
        notes TEXT,
        captured_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'PENDING',
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at TEXT,
        last_error TEXT,
        server_id TEXT,
        uploaded_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_captures_status ON field_captures(status, next_attempt_at);
      CREATE INDEX IF NOT EXISTS idx_captures_monument ON field_captures(monument_id, angle);

      CREATE TABLE IF NOT EXISTS sync_state (
        resource TEXT PRIMARY KEY NOT NULL,
        last_synced_at TEXT,
        cursor TEXT
      );
    `,
  },
];
