import {
  assembleHierarchicalRagContext,
  cosineSimilarity,
  hybridGeoVisualScan,
  rankMonuments,
  SEARCH_RADIUS_M,
} from '../backend/src/heritage/services/vectorSearch.service';
import { SAALIK_EDITORIAL_CITATION } from '../backend/src/heritage/types/heritage';
import {
  embeddingForAngle,
  getCorpus,
  loadConfusableTemples,
  perturb,
} from './helpers/fixtures';

describe('multi-angle temple disambiguation', () => {
  const temples = loadConfusableTemples();
  const corpus = getCorpus();

  test('corpus supplies three confusable Kathmandu Durbar temples with 5 angles each', () => {
    expect(temples).toHaveLength(3);
    for (const temple of temples) {
      expect(temple.referenceEmbeddings).toHaveLength(5);
      expect(temple.visualCues.confusableWith.length).toBeGreaterThan(0);
      expect(temple.geo.lat).toBeGreaterThan(27);
      expect(temple.geo.lng).toBeGreaterThan(85);
    }
  });

  test('Kasthamandap ESTABLISHING_FRONT query ranks Kasthamandap above Trailokya Mohan and Maju Dega', () => {
    const [kasthamandap, trailokya, maju] = temples;
    expect(kasthamandap!.id).toBe('ktm_kasthamandap');

    const query = perturb(embeddingForAngle(kasthamandap!, 'ESTABLISHING_FRONT'));
    const fix = {
      lat: kasthamandap!.geo.lat,
      lng: kasthamandap!.geo.lng,
      accuracyM: 8,
    };

    const { matches, radiusM } = rankMonuments(query, temples, { topK: 3, fix });

    expect(radiusM).toBe(SEARCH_RADIUS_M);
    expect(matches[0]!.monument.id).toBe('ktm_kasthamandap');
    expect(matches[0]!.score).toBeGreaterThan(matches[1]!.score);
    expect(matches.map((m) => m.monument.id)).toEqual(
      expect.arrayContaining([kasthamandap!.id, trailokya!.id, maju!.id]),
    );
    expect(matches[0]!.bestAngle).toBe('ESTABLISHING_FRONT');
    expect(matches[0]!.maxAngleSimilarity).toBeGreaterThanOrEqual(matches[0]!.top3MeanSimilarity);
    expect(matches[0]!.score).toBeCloseTo(
      0.6 * matches[0]!.maxAngleSimilarity + 0.4 * matches[0]!.top3MeanSimilarity,
      5,
    );
  });

  test('CLOSE_UP_ICONOGRAPHY angle still disambiguates Kasthamandap from its confusable neighbours', () => {
    const kasthamandap = temples.find((t) => t.id === 'ktm_kasthamandap')!;
    const query = perturb(embeddingForAngle(kasthamandap, 'CLOSE_UP_ICONOGRAPHY'), 0.03);
    const { matches } = rankMonuments(query, temples, {
      topK: 1,
      fix: { lat: kasthamandap.geo.lat, lng: kasthamandap.geo.lng, accuracyM: 5 },
    });
    expect(matches[0]!.monument.id).toBe('ktm_kasthamandap');
    expect(matches[0]!.bestAngle).toBe('CLOSE_UP_ICONOGRAPHY');
  });

  test('Trailokya Mohan LEFT_45 query prefers Trailokya Mohan', () => {
    const trailokya = temples.find((t) => t.id === 'ktm_trailokya_mohan')!;
    const query = perturb(embeddingForAngle(trailokya, 'LEFT_45'));
    const { matches } = rankMonuments(query, temples, {
      topK: 2,
      fix: { lat: trailokya.geo.lat, lng: trailokya.geo.lng, accuracyM: 10 },
    });
    expect(matches[0]!.monument.id).toBe('ktm_trailokya_mohan');
    expect(matches[0]!.score).toBeGreaterThan(0.7);
  });

  test('hybrid scan assembles hierarchical RAG with sumandangal.com citation and nearby tour', () => {
    const kasthamandap = temples.find((t) => t.id === 'ktm_kasthamandap')!;
    const query = embeddingForAngle(kasthamandap, 'ESTABLISHING_FRONT');
    const result = hybridGeoVisualScan({
      queryEmbedding: query,
      fix: { lat: kasthamandap.geo.lat, lng: kasthamandap.geo.lng, accuracyM: 6 },
      monuments: temples,
      walkingTours: corpus.walkingTours,
      sourceCatalog: corpus.sources,
      topK: 2,
    });

    expect(result.source).toBe('cloud_visual');
    expect(result.matches[0]!.monument.id).toBe('ktm_kasthamandap');
    expect(result.rag).not.toBeNull();
    expect(result.rag!.nodePath).toContain('kathmandu_durbar/ktm_kasthamandap');
    expect(result.rag!.lore.length).toBeGreaterThan(0);
    expect(result.rag!.editorialAttribution.url).toBe('https://www.sumandangal.com/');

    const allCitationUrls = result.rag!.lore.flatMap((chunk) =>
      chunk.citations.map((c) => c.url).filter(Boolean),
    );
    expect(allCitationUrls).toContain('https://www.sumandangal.com/');

    expect(result.rag!.nearbyTours.some((t) => t.tourId === 'ktm_durbar_royal_loop')).toBe(true);

    const assembled = assembleHierarchicalRagContext({
      match: result.matches[0]!,
      sourceCatalog: corpus.sources,
      walkingTours: corpus.walkingTours,
    });
    expect(assembled.editorialAttribution.id).toBe(SAALIK_EDITORIAL_CITATION.id);
    expect(assembled.lore.every((c) => c.nodePath.includes('ktm_kasthamandap'))).toBe(true);
  });

  test('cosineSimilarity is symmetric and self-similarity is 1', () => {
    const v = temples[0]!.referenceEmbeddings[0]!.vector;
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 5);
    const w = temples[1]!.referenceEmbeddings[0]!.vector;
    expect(cosineSimilarity(v, w)).toBeCloseTo(cosineSimilarity(w, v), 10);
  });
});
