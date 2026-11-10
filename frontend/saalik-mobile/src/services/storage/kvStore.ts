import { getDatabase } from './database';

const memoryStore = new Map<string, string>();

export async function kvGet(key: string): Promise<string | null> {
  const db = await getDatabase();
  if (!db) return memoryStore.get(key) ?? null;
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM kv_store WHERE key = ?', key);
  return row?.value ?? null;
}

export async function kvSet(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  if (!db) {
    memoryStore.set(key, value);
    return;
  }
  await db.runAsync(
    'INSERT INTO kv_store (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at',
    key,
    value,
    new Date().toISOString(),
  );
}

export async function kvGetJSON<T>(key: string, fallback: T): Promise<T> {
  const raw = await kvGet(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function kvSetJSON<T>(key: string, value: T): Promise<void> {
  await kvSet(key, JSON.stringify(value));
}
