import {
  DEGRADED_SEARCH_RADIUS_M,
  SEARCH_RADIUS_M,
  filterByGeo,
  haversineMeters,
  hybridGeoVisualScan,
  isGpsDegraded,
  rankByProximity,
  rankMonuments,
} from '../backend/src/heritage/services/vectorSearch.service';
import { embeddingForAngle, getCorpus, loadConfusableTemples } from './helpers/fixtures';

describe('GPS fallback mode', () => {
  const temples = loadConfusableTemples();
  const corpus = getCorpus();
  const kasthamandap = temples.find((t) => t.id === 'ktm_kasthamandap')!;

  test('haversineMeters returns ~0 for identical points and grows with separation', () => {
    expect(haversineMeters(kasthamandap.geo, kasthamandap.geo)).toBeCloseTo(0, 5);
    const nearby = { lat: kasthamandap.geo.lat + 0.001, lng: kasthamandap.geo.lng };
    const far = { lat: kasthamandap.geo.lat + 0.1, lng: kasthamandap.geo.lng };
    expect(haversineMeters(kasthamandap.geo, nearby)).toBeLessThan(
      haversineMeters(kasthamandap.geo, far),
    );
    expect(haversineMeters(kasthamandap.geo, nearby)).toBeGreaterThan(90);
    expect(haversineMeters(kasthamandap.geo, nearby)).toBeLessThan(130);
  });

  test('accurate GPS inside Durbar Square uses 350m radius', () => {
    const fix = { lat: kasthamandap.geo.lat, lng: kasthamandap.geo.lng, accuracyM: 12 };
    expect(isGpsDegraded(fix)).toBe(false);
    const filtered = filterByGeo(corpus.monuments, fix);
    expect(filtered.radiusM).toBe(SEARCH_RADIUS_M);
    expect(filtered.degraded).toBe(false);
    expect(filtered.candidates.every((c) => (c.distanceM ?? 0) <= SEARCH_RADIUS_M + 80)).toBe(true);
    expect(filtered.candidates.some((c) => c.monument.id === 'ktm_kasthamandap')).toBe(true);
  });

  test('degraded GPS accuracy expands search radius to 10km', () => {
    const fix = { lat: kasthamandap.geo.lat, lng: kasthamandap.geo.lng, accuracyM: 120 };
    expect(isGpsDegraded(fix)).toBe(true);
    const filtered = filterByGeo(corpus.monuments, fix);
    expect(filtered.radiusM).toBe(DEGRADED_SEARCH_RADIUS_M);
    expect(filtered.degraded).toBe(true);
    expect(filtered.candidates.length).toBeGreaterThan(20);
  });

  test('null accuracy is treated as degraded and expands to 10km', () => {
    const fix = { lat: kasthamandap.geo.lat, lng: kasthamandap.geo.lng, accuracyM: null };
    const filtered = filterByGeo(corpus.monuments, fix);
    expect(filtered.radiusM).toBe(DEGRADED_SEARCH_RADIUS_M);
  });

  test('accurate GPS with no monuments inside 350m falls back to 10km', () => {
    // Point in the middle of nowhere relative to the valley corpus
    const fix = { lat: 28.5, lng: 84.0, accuracyM: 5 };
    const filtered = filterByGeo(corpus.monuments, fix);
    expect(filtered.radiusM).toBe(DEGRADED_SEARCH_RADIUS_M);
    expect(filtered.degraded).toBe(true);
  });

  test('rankByProximity returns nearest monuments when visual embedding is absent', () => {
    const fix = { lat: kasthamandap.geo.lat, lng: kasthamandap.geo.lng, accuracyM: 8 };
    const matches = rankByProximity(temples, fix, 3);
    expect(matches[0]!.monument.id).toBe('ktm_kasthamandap');
    expect(matches[0]!.distanceM).toBeLessThanOrEqual(matches[1]!.distanceM!);
    expect(matches[0]!.bestAngle).toBeNull();
    expect(matches[0]!.maxAngleSimilarity).toBe(0);
  });

  test('hybrid scan GPS-only path sets source gps_only and still builds RAG', () => {
    const result = hybridGeoVisualScan({
      queryEmbedding: null,
      fix: { lat: kasthamandap.geo.lat, lng: kasthamandap.geo.lng, accuracyM: 9 },
      monuments: temples,
      walkingTours: corpus.walkingTours,
      sourceCatalog: corpus.sources,
    });
    expect(result.source).toBe('gps_only');
    expect(result.matches[0]!.monument.id).toBe('ktm_kasthamandap');
    expect(result.rag?.monumentId).toBe('ktm_kasthamandap');
    expect(result.notice).toMatch(/proximity/i);
  });

  test('far-away accurate GPS excludes Durbar temples from tight visual rank', () => {
    const query = embeddingForAngle(kasthamandap, 'ESTABLISHING_FRONT');
    // ~2km north — outside 350m but inside 10km fallback when empty
    const fix = { lat: kasthamandap.geo.lat + 0.02, lng: kasthamandap.geo.lng, accuracyM: 8 };
    const distance = haversineMeters(fix, kasthamandap.geo);
    expect(distance).toBeGreaterThan(SEARCH_RADIUS_M);

    const tight = filterByGeo(temples, fix);
    // empty tight set → expanded
    expect(tight.radiusM).toBe(DEGRADED_SEARCH_RADIUS_M);

    const { matches } = rankMonuments(query, temples, { topK: 1, fix });
    expect(matches[0]!.monument.id).toBe('ktm_kasthamandap');
  });
});
