import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createHeritageApp, loadHeritageCorpus } from '../backend/src/heritage';
import { isCompleteMonument } from '../frontend/saalik-mobile/src/types/heritage';

let server: Server;
let url = '';

beforeAll(async () => {
  server = createHeritageApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/heritage/sync/monuments`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

const sync = async (query = ''): Promise<{ corpusVersion: string; monuments: unknown[]; deletedIds: string[] }> =>
  (await (await fetch(url + query)).json()) as { corpusVersion: string; monuments: unknown[]; deletedIds: string[] };

describe('monument sync contract between the API and the app', () => {
  it('sends records the app can render: every one passes the app\'s own completeness check', async () => {
    const delta = await sync();
    expect(delta.monuments).toHaveLength(101);
    expect(delta.monuments.filter((monument) => !isCompleteMonument(monument))).toEqual([]);
    expect(delta.deletedIds).toEqual([]);
  });

  it('sends nothing to a client that already synced this corpus build', async () => {
    expect((await sync(`?since=${encodeURIComponent(new Date().toISOString())}`)).monuments).toEqual([]);
    expect((await sync('?since=2000-01-01T00:00:00.000Z')).monuments).toHaveLength(101);
  });

  it('rejects the trimmed search record that used to be sent and crashed the heritage screens', () => {
    const trimmed = loadHeritageCorpus().monuments[0]!;
    expect('walkingTourStop' in trimmed).toBe(false);
    expect(isCompleteMonument(trimmed)).toBe(false);
    expect(isCompleteMonument(null)).toBe(false);
  });
});
