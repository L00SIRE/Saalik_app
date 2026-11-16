/**
 * Rehearses the five-minute NTB demo without a phone or a browser:
 * scan -> story -> 90-minute walk -> scan-led booking -> guide dashboard -> command center,
 * then checks that the film and the pitch pack quote the benchmark that was actually measured.
 */
import { readFileSync } from 'fs';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import path from 'path';
import { createHeritageApp, loadHeritageCorpus } from '../backend/src/heritage';
import { loadBenchmarkSummary } from '../apps/ntb-command-center/src/lib/benchmark';
import * as demo from '../frontend/saalik-mobile/src/services/demoSession';
import { buildHeritageWalk } from '../frontend/saalik-mobile/src/services/route/walkOptimizer';
import type { HeritageMonument } from '../frontend/saalik-mobile/src/types/heritage';

// The demo session persists through AsyncStorage on the phone; an in-memory map stands in for it.
jest.mock(
  '@react-native-async-storage/async-storage',
  () => {
    const data = new Map<string, string>();
    return {
      __esModule: true,
      default: {
        getItem: async (key: string) => data.get(key) ?? null,
        setItem: async (key: string, value: string) => void data.set(key, value),
        removeItem: async (key: string) => void data.delete(key),
        multiRemove: async (keys: string[]) => keys.forEach((key) => data.delete(key)),
      },
    };
  },
  { virtual: true },
);

const ROOT = path.join(__dirname, '..');
const KRISHNA = 'pat_krishna_mandir';
const corpus = loadHeritageCorpus();
const krishna = corpus.monuments.find((monument) => monument.id === KRISHNA)!;

let server: Server;
let api = '';

const post = (route: string, body: unknown) =>
  fetch(`${api}${route}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const json = (response: Response): Promise<any> => response.json();

beforeAll(async () => {
  server = createHeritageApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  api = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/heritage`;
});

afterAll(async () => {
  await demo.stop();
  await new Promise((resolve) => server.close(resolve));
});

describe('NTB pitch rehearsal', () => {
  it('0:30 scans Krishna Mandir and gets its sourced story back', async () => {
    const response = await post('/scan', {
      queryEmbedding: krishna.referenceEmbeddings.find((ref) => ref.angle === 'ESTABLISHING_FRONT')!.vector,
      lat: krishna.geo.lat,
      lng: krishna.geo.lng,
      accuracyM: 10,
    });
    expect(response.status).toBe(200);
    const scan = await json(response);

    expect(scan.matches[0].monumentId).toBe(KRISHNA);
    expect(scan.matches[0].monument.names.en).toBe('Krishna Mandir');
    expect(scan.rag.nodePath).toContain(`patan_durbar/${KRISHNA}`);
    expect(scan.rag.lore.length).toBeGreaterThan(0);
    expect(scan.rag.nearbyTours.some((tour: { tourId: string }) => tour.tourId === 'pat_city_of_artisans')).toBe(true);
  });

  it('2:10 builds a 90-minute walk that starts at the scanned monument', () => {
    const seed = JSON.parse(
      readFileSync(path.join(ROOT, 'frontend/saalik-mobile/src/data/heritageSeed.json'), 'utf8'),
    ) as { monuments: HeritageMonument[] };
    const patan = seed.monuments.filter((monument) => monument.zoneId === 'patan_durbar');
    const start = patan.find((monument) => monument.id === KRISHNA)!;
    const walk = buildHeritageWalk(start.geo, patan, 90);

    expect(walk.stops[0]!.monument.id).toBe(KRISHNA);
    expect(walk.stops.length).toBeGreaterThan(2);
    expect(walk.totalMinutes).toBeLessThanOrEqual(90);
  });

  it("3:10 puts Aanya's scan-led booking at the top of Bishnu's pending list", async () => {
    await demo.start('traveler-aanya');
    const bookingDate = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const scanLed = await demo.createTravelerBooking({
      tourId: 'tour-bishnu-1',
      scheduleId: 'sched-bishnu-1a',
      bookingDate,
      partySize: 2,
      monument: { id: KRISHNA, name: 'Krishna Mandir' },
    });
    // A scan-led booking on another guide's tour must not reach Bishnu.
    await demo.createTravelerBooking({
      tourId: 'tour-ptn-1',
      scheduleId: 'sched-ptn-1a',
      bookingDate,
      partySize: 1,
      monument: { id: KRISHNA, name: 'Krishna Mandir' },
    });
    expect(scanLed.status).toBe('PENDING');

    await demo.switchPersona('guide-bishnu');
    const incoming = demo.listGuideIncoming();
    expect(incoming[0]).toMatchObject({
      id: scanLed.id,
      status: 'PENDING',
      monumentId: KRISHNA,
      monumentName: 'Krishna Mandir',
      partySize: 2,
    });
    expect(incoming[0]!.notes).toContain('Krishna Mandir');
    expect(incoming.filter((booking) => booking.tourId === 'tour-ptn-1')).toEqual([]);

    await demo.switchPersona('traveler-aanya');
    expect(demo.listTravelerBookings().some((booking) => booking.id === scanLed.id)).toBe(true);

    await demo.reset();
    await demo.switchPersona('guide-bishnu');
    expect(demo.listGuideIncoming().some((booking) => booking.id === scanLed.id)).toBe(false);
  });

  it('3:10 records the guide request with the API and confirms it', async () => {
    const created = await post('/bookings', {
      walkingTourId: 'pat_city_of_artisans',
      userId: 'aanya',
      bookingDate: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      partySize: 2,
      notes: 'Booked after scanning Krishna Mandir.',
    });
    expect(created.status).toBe(201);
    const booking = await json(created);
    expect(booking.status).toBe('PENDING');

    const confirmed = await post(`/bookings/${booking.id}/transition`, { to: 'CONFIRMED', actorId: 'bishnu' });
    expect((await json(confirmed)).status).toBe('CONFIRMED');
    // A confirmed walk cannot go back to pending; only complete, cancel or no-show remain.
    const completed = await post(`/bookings/${booking.id}/transition`, { to: 'COMPLETED', actorId: 'bishnu' });
    expect((await json(completed)).status).toBe('COMPLETED');
    expect((await post(`/bookings/${booking.id}/transition`, { to: 'CANCELLED' })).status).toBe(400);
  });

  it('4:10 shows the scan in the command center feed', async () => {
    const before = await json(await fetch(`${api}/command-center`));
    await post('/telemetry/scans', { events: [{ monumentId: KRISHNA, zoneId: 'patan_durbar', convertedToBooking: true }] });
    const after = await json(await fetch(`${api}/command-center`));

    expect(after.monumentCount).toBe(101);
    expect(after.zoneCount).toBe(8);
    expect(after.scanEvents).toBe(before.scanEvents + 1);
  });

  it('quotes the measured benchmark in the film and the pitch pack', () => {
    const benchmark = loadBenchmarkSummary(ROOT);
    expect(benchmark.recallAt1).toBeGreaterThanOrEqual(0.82);

    const quoted = [
      benchmark.recallAt1.toFixed(3),
      benchmark.recallAt3.toFixed(3),
      `${benchmark.latencyMs.toFixed(1)} ms`,
      `${benchmark.photos} `,
    ];
    for (const file of ['01_NTB_EXECUTIVE_BRIEF.md', '03_5MIN_DEMO_SCRIPT.md']) {
      const text = readFileSync(path.join(ROOT, 'docs/ntb_pitch_pack', file), 'utf8');
      for (const figure of quoted) expect(text).toContain(figure);
    }
  });
});
