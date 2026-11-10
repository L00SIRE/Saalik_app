import { kvGet, kvSet } from './storage/kvStore';

const DEVICE_ID_KEY = 'device.id';

export function generateId(prefix: string): string {
  const time = Date.now().toString(36);
  const random = Array.from({ length: 3 }, () => Math.floor(Math.random() * 0xffffffff).toString(36)).join('');
  return `${prefix}_${time}_${random}`;
}

export async function getDeviceId(): Promise<string> {
  const existing = await kvGet(DEVICE_ID_KEY);
  if (existing) return existing;
  const id = generateId('device');
  await kvSet(DEVICE_ID_KEY, id);
  return id;
}
