import { readFileSync } from 'fs';
import path from 'path';
import {
  buildHeritageWalk,
  twoOpt,
  WALK_SPEED_M_PER_MIN,
} from '../frontend/saalik-mobile/src/services/route/walkOptimizer';
import { haversineMeters } from '../frontend/saalik-mobile/src/services/vector/similarity';
import type { HeritageMonument } from '../frontend/saalik-mobile/src/types/heritage';

const seed = JSON.parse(
  readFileSync(path.join(__dirname, '../frontend/saalik-mobile/src/data/heritageSeed.json'), 'utf8'),
) as { monuments: HeritageMonument[] };
const patan = seed.monuments.filter((m) => m.zoneId === 'patan_durbar');
const krishna = patan.find((m) => m.id === 'pat_krishna_mandir')!;

const pathLength = (start: { lat: number; lng: number }, order: HeritageMonument[]) =>
  order.reduce((sum, m, i) => sum + haversineMeters(i === 0 ? start : order[i - 1]!.geo, m.geo), 0);

describe('90-minute heritage walk', () => {
  it('2-opt never lengthens a route and keeps every stop exactly once', () => {
    const scrambled = patan.slice().reverse();
    const improved = twoOpt(krishna.geo, scrambled);
    expect(pathLength(krishna.geo, improved)).toBeLessThanOrEqual(pathLength(krishna.geo, scrambled));
    expect(improved.map((m) => m.id).sort()).toEqual(patan.map((m) => m.id).sort());
  });

  it('2-opt removes a crossing from a zig-zag route', () => {
    const at = (id: string, lng: number): HeritageMonument => ({ ...krishna, id, geo: { ...krishna.geo, lng } });
    const start = { lat: krishna.geo.lat, lng: 85.32 };
    const zigzag = [at('c', 85.323), at('a', 85.321), at('d', 85.324), at('b', 85.322)];
    expect(twoOpt(start, zigzag).map((m) => m.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('starts at the scanned monument, stays in budget and counts walking plus dwell time', () => {
    const walk = buildHeritageWalk(krishna.geo, patan, 90);
    expect(walk.stops[0]!.monument.id).toBe('pat_krishna_mandir');
    expect(walk.stops.length).toBeGreaterThan(1);
    expect(walk.totalMinutes).toBeLessThanOrEqual(90);
    const dwell = walk.stops.reduce((sum, stop) => sum + stop.dwellMinutes, 0);
    expect(walk.totalMinutes).toBeCloseTo(walk.totalDistanceM / WALK_SPEED_M_PER_MIN + dwell, 6);
  });

  it('fits more stops as the budget grows, and every stop when there is no limit', () => {
    const short = buildHeritageWalk(krishna.geo, patan, 45).stops.length;
    const standard = buildHeritageWalk(krishna.geo, patan, 90).stops.length;
    expect(standard).toBeGreaterThan(short);
    expect(buildHeritageWalk(krishna.geo, patan, 10_000).stops.length).toBe(patan.length);
  });

  it('returns no stops when nothing is reachable in time', () => {
    expect(buildHeritageWalk({ lat: 40.7, lng: -74 }, patan, 90).stops).toEqual([]);
  });
});
