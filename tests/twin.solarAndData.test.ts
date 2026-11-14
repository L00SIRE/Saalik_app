import {
  classifyLighting,
  daylightWindow,
  formatNpt,
  nptToUtc,
  shadowLengthM,
  solarPosition,
  sunDirection,
} from '../apps/ntb-command-center/src/lib/twin/solar';
import { ARCHETYPE_BY_TYPE, GEOFENCE_RADIUS_M, loadTwinData } from '../apps/ntb-command-center/src/lib/twin/twinData';

describe('Kathmandu winter sun model', () => {
  it('puts the December solstice noon sun due south at 90 - latitude - 23.44 degrees', () => {
    const window = daylightWindow(2026, 12, 21);
    const noon = solarPosition(nptToUtc(2026, 12, 21, window.solarNoonMin));
    expect(noon.elevationDeg).toBeCloseTo(90 - 27.7172 - 23.44, 0);
    expect(Math.abs(noon.azimuthDeg - 180)).toBeLessThan(1.5);
    // NPT's meridian (86.25 E) is just east of Kathmandu, so solar noon falls a few minutes after 12:00.
    expect(Math.abs(window.solarNoonMin - (12 * 60 + 2))).toBeLessThanOrEqual(4);
  });

  it('matches almanac sunrise and sunset for 21 December (06:53 / 17:14 NPT)', () => {
    const window = daylightWindow(2026, 12, 21);
    expect(Math.abs(window.sunriseMin - (6 * 60 + 53))).toBeLessThanOrEqual(6);
    expect(Math.abs(window.sunsetMin - (17 * 60 + 14))).toBeLessThanOrEqual(6);
  });

  it('keeps the sun below the horizon at 06:00 NPT through December and January', () => {
    for (const [month, day] of [[12, 1], [12, 21], [1, 15], [1, 31]] as const) {
      expect(solarPosition(nptToUtc(2027, month, day, 6 * 60)).elevationDeg).toBeLessThan(0);
    }
  });

  it('rises in the south-east and sets in the south-west in winter', () => {
    const morning = solarPosition(nptToUtc(2026, 12, 21, 8 * 60));
    const evening = solarPosition(nptToUtc(2026, 12, 21, 16 * 60));
    expect(morning.azimuthDeg).toBeGreaterThan(110);
    expect(morning.azimuthDeg).toBeLessThan(140);
    expect(evening.azimuthDeg).toBeGreaterThan(220);
    expect(evening.azimuthDeg).toBeLessThan(250);
  });

  it('converts sun angles to scene axes and shadow lengths', () => {
    const south = sunDirection({ azimuthDeg: 180, elevationDeg: 45 });
    expect(south.x).toBeCloseTo(0, 6);
    expect(south.y).toBeCloseTo(Math.SQRT1_2, 6);
    expect(south.z).toBeCloseTo(Math.SQRT1_2, 6);
    expect(sunDirection({ azimuthDeg: 90, elevationDeg: 0 }).x).toBeCloseTo(1, 6);
    expect(shadowLengthM(10, 45)).toBeCloseTo(10, 6);
    expect(shadowLengthM(10, 0)).toBe(Number.POSITIVE_INFINITY);
  });

  it('classifies facade lighting from the camera bearing', () => {
    const lowSouthEastSun = { azimuthDeg: 135, elevationDeg: 20 };
    // Looking north-west, the sun is behind the photographer.
    expect(classifyLighting(lowSouthEastSun, 315)).toBe('FRONT_LIT');
    expect(classifyLighting(lowSouthEastSun, 135)).toBe('BACKLIT');
    expect(classifyLighting(lowSouthEastSun, 45)).toBe('SIDE_LIT');
    expect(classifyLighting({ azimuthDeg: 135, elevationDeg: -3 }, 315)).toBe('NO_SUN');
    expect(formatNpt(6 * 60 + 5)).toBe('06:05');
  });
});

describe('digital twin data from the heritage seed', () => {
  const data = loadTwinData();
  const monuments = data.zones.flatMap((zone) => zone.monuments);

  it('loads all eight zones and 101 monuments', () => {
    expect(data.zones).toHaveLength(8);
    expect(monuments).toHaveLength(101);
    expect(data.geofenceRadiusM).toBe(GEOFENCE_RADIUS_M);
  });

  it('maps every corpus monument type to a drawable archetype', () => {
    const unmapped = [...new Set(monuments.map((m) => m.monumentType))].filter((type) => !(type in ARCHETYPE_BY_TYPE));
    expect(unmapped).toEqual([]);
  });

  it('gives every monument the five capture angles, a size and a facade bearing', () => {
    for (const monument of monuments) {
      expect(monument.captureAngles.map((a) => a.angle).sort()).toEqual([
        'CLOSE_UP_ICONOGRAPHY',
        'ESTABLISHING_FRONT',
        'LEFT_45',
        'RIGHT_45',
        'WIDE_COURTYARD_CONTEXT',
      ]);
      expect(monument.heightM).toBeGreaterThan(0);
      expect(monument.footprintM).toBeGreaterThan(0);
      expect(monument.facingDeg).toBeGreaterThanOrEqual(0);
      expect(monument.facingDeg).toBeLessThan(360);
    }
  });

  it('scales pagodas with their roof tiers', () => {
    const nyatapola = monuments.find((m) => m.id === 'bkt_nyatapola')!;
    const twoTier = monuments.find((m) => m.archetype === 'PAGODA' && m.roofTiers === 2)!;
    expect(nyatapola.roofTiers).toBe(5);
    expect(nyatapola.heightM).toBeGreaterThan(twoTier.heightM);
  });

  it('lists only neighbours inside the 150 m geofence, nearest first, with valid cosines', () => {
    for (const monument of monuments) {
      const distances = monument.neighbors.map((n) => n.distanceM);
      expect(distances).toEqual([...distances].sort((a, b) => a - b));
      for (const neighbor of monument.neighbors) {
        expect(neighbor.distanceM).toBeLessThanOrEqual(GEOFENCE_RADIUS_M);
        if (neighbor.cosine !== null) expect(Math.abs(neighbor.cosine)).toBeLessThanOrEqual(1.0001);
      }
    }
    const kumari = monuments.find((m) => m.id === 'ktm_kumari_ghar')!;
    expect(kumari.neighbors.length).toBeGreaterThan(3);
    expect(kumari.neighbors.some((n) => n.cosine !== null)).toBe(true);
  });

  it('faces a monument east of the plaza centre toward the west', () => {
    const zone = data.zones.find((z) => z.zoneId === 'kathmandu_durbar')!;
    const east = zone.monuments.reduce((a, b) => (b.x > a.x ? b : a));
    const toCentre = ((Math.atan2(-east.x, east.z) * 180) / Math.PI + 360) % 360;
    expect(east.facingDeg).toBeCloseTo(toCentre, 6);
    expect(east.facingDeg).toBeGreaterThan(180);
  });
});
