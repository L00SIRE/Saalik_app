import * as SQLite from 'expo-sqlite';
import { MIGRATIONS } from './migrations';

export type Database = SQLite.SQLiteDatabase;

const DATABASE_NAME = 'saalik_heritage.db';

let databasePromise: Promise<Database | null> | null = null;

/**
 * Opens the local SQLite database and applies pending migrations.
 * Resolves to null where SQLite is unavailable (e.g. web preview), so callers
 * can fall back to the bundled corpus and in-memory state.
 */
export function getDatabase(): Promise<Database | null> {
  if (!databasePromise) {
    databasePromise = openAndMigrate();
  }
  return databasePromise;
}

async function openAndMigrate(): Promise<Database | null> {
  try {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
    await applyMigrations(db);
    return db;
  } catch (error) {
    console.warn('[storage] SQLite unavailable; using in-memory fallback.', error);
    return null;
  }
}

async function applyMigrations(db: Database): Promise<void> {
  await db.execAsync(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY NOT NULL, name TEXT NOT NULL, applied_at TEXT NOT NULL);',
  );
  const applied = await db.getAllAsync<{ version: number }>('SELECT version FROM schema_migrations');
  const appliedVersions = new Set(applied.map((row) => row.version));

  for (const migration of MIGRATIONS) {
    if (appliedVersions.has(migration.version)) continue;
    await db.withExclusiveTransactionAsync(async (txn) => {
      await txn.execAsync(migration.sql);
      await txn.runAsync(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
        migration.version,
        migration.name,
        new Date().toISOString(),
      );
    });
  }
}
