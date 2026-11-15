import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { createHeritageApp } from '../backend/src/heritage';

const KUMARI_GHAR = { lat: 27.7036, lng: 85.3069 };
const realFetch = globalThis.fetch;
const vector = Array.from({ length: 512 }, (_, i) => (i === 0 ? 1 : 0));

let server: Server;
let base = '';
let workerReply: (() => Response) | null = null;
let workerBodies: Array<Record<string, unknown>> = [];

beforeAll(async () => {
  server = createHeritageApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/heritage`;

  // Only the CLIP worker call is faked; the request to the route under test goes over real HTTP.
  globalThis.fetch = (async (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    if (!String(input).endsWith('/embed')) return realFetch(input, init);
    workerBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
    if (!workerReply) throw new Error('worker offline');
    return workerReply();
  }) as typeof fetch;
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  await new Promise((resolve) => server.close(resolve));
});

beforeEach(() => {
  workerBodies = [];
});

async function scan(): Promise<any> {
  const response = await realFetch(`${base}/scan-image`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ imageBase64: 'aGVsbG8=', ...KUMARI_GHAR, accuracyM: 12 }),
  });
  expect(response.status).toBe(200);
  return response.json();
}

const worker = (body: Record<string, unknown>) => () =>
  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });

describe('POST /scan-image ranking source', () => {
  it("uses the worker's two-stage ranking and keeps confidence on the visual score", async () => {
    workerReply = worker({
      vector,
      quality: { passed: true },
      elapsedMs: 51,
      searchRadiusM: 150,
      matches: [
        // GPS prior lifted a weak visual match to the top: ranking follows `score`, confidence follows `stage1`.
        { monumentId: 'ktm_kumari_ghar', score: 0.75, stage1: 0.64 },
        { monumentId: 'ktm_gaddhi_baithak', score: 0.71, stage1: 0.7 },
      ],
    });
    const body = await scan();

    expect(workerBodies[0]).toMatchObject({ lat: KUMARI_GHAR.lat, lng: KUMARI_GHAR.lng, accuracyM: 12, topK: 3 });
    expect(body.source).toBe('cloud_visual');
    expect(body.searchRadiusM).toBe(150);
    expect(body.matches.map((m: any) => m.monumentId)).toEqual(['ktm_kumari_ghar', 'ktm_gaddhi_baithak']);
    expect(body.matches[0].monument.names.en).toBe('Kumari Ghar');
    expect(body.matches[0].score).toBe(0.75);
    expect(body.matches[0].confidence).toBe('LOW');
    expect(body.matches[1].confidence).toBe('MEDIUM');
    expect(body.matches[0].distanceM).toBeLessThan(5);
  });

  it('falls back to the local index when the worker finds nothing in range', async () => {
    workerReply = worker({ vector, quality: null, elapsedMs: 50, searchRadiusM: 150, matches: [] });
    const body = await scan();

    expect(body.source).toBe('cloud_visual');
    expect(body.searchRadiusM).toBe(350);
    expect(body.matches.length).toBeGreaterThan(0);
    for (const match of body.matches) expect(match.distanceM).toBeLessThanOrEqual(350);
  });

  it('still answers from the local index when the worker is down', async () => {
    workerReply = null;
    const body = await scan();

    expect(body.source).toBe('gps_only');
    expect(body.embeddingSource).toBe('deterministic_fallback');
    expect(body.notice).toMatch(/offline/i);
    expect(body.matches.length).toBeGreaterThan(0);
  });
});
