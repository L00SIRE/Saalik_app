import type {
  CaptureAngle,
  GeoFix,
  HeritageMonument,
  MatchConfidence,
  MonumentMatch,
} from '../../types/heritage';

// Kept identical to backend/src/services/vectorSearch.service.ts so on-device
// demo results match the cloud ranking.
export const SEARCH_RADIUS_M = 350;
export const DEGRADED_SEARCH_RADIUS_M = 10_000;
export const DEGRADED_GPS_ACCURACY_M = 50;
export const MAX_ANGLE_WEIGHT = 0.6;
export const TOP3_MEAN_WEIGHT = 0.4;

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector.slice();
  return vector.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface PooledSimilarity {
  score: number;
  maxAngleSimilarity: number;
  top3MeanSimilarity: number;
  bestAngle: CaptureAngle | null;
}

/** 0.6 * max_angle_similarity + 0.4 * top3_mean_similarity across a monument's reference angles. */
export function angleWeightedSimilarity(query: number[], monument: HeritageMonument): PooledSimilarity {
  const sims = monument.referenceEmbeddings
    .map((ref) => ({ angle: ref.angle, sim: cosineSimilarity(query, ref.vector) }))
    .sort((x, y) => y.sim - x.sim);
  if (sims.length === 0) {
    return { score: 0, maxAngleSimilarity: 0, top3MeanSimilarity: 0, bestAngle: null };
  }
  const max = sims[0]!.sim;
  const top3 = sims.slice(0, 3);
  const top3Mean = top3.reduce((sum, s) => sum + s.sim, 0) / top3.length;
  return {
    score: MAX_ANGLE_WEIGHT * max + TOP3_MEAN_WEIGHT * top3Mean,
    maxAngleSimilarity: max,
    top3MeanSimilarity: top3Mean,
    bestAngle: sims[0]!.angle,
  };
}

export function classifyConfidence(score: number, marginToNext: number): MatchConfidence {
  if (score >= 0.82 && marginToNext >= 0.04) return 'HIGH';
  if (score >= 0.65) return 'MEDIUM';
  return 'LOW';
}

export interface GeoFilterResult {
  candidates: { monument: HeritageMonument; distanceM: number | null }[];
  radiusM: number | null;
}

/** Stage 1: keep monuments within the search radius; widen when GPS is degraded or nothing is nearby. */
export function filterByGeo(monuments: HeritageMonument[], fix: GeoFix | null): GeoFilterResult {
  if (!fix) {
    return { candidates: monuments.map((m) => ({ monument: m, distanceM: null })), radiusM: null };
  }
  const withDistance = monuments.map((m) => ({ monument: m, distanceM: haversineMeters(fix, m.geo) }));
  const degraded = fix.accuracyM === null || fix.accuracyM > DEGRADED_GPS_ACCURACY_M;
  const primaryRadius = degraded ? DEGRADED_SEARCH_RADIUS_M : SEARCH_RADIUS_M;
  let inside = withDistance.filter((c) => (c.distanceM ?? 0) <= primaryRadius + c.monument.geo.geofenceRadiusM);
  let radiusM = primaryRadius;
  if (inside.length === 0 && !degraded) {
    radiusM = DEGRADED_SEARCH_RADIUS_M;
    inside = withDistance.filter((c) => (c.distanceM ?? 0) <= radiusM);
  }
  return { candidates: inside, radiusM };
}

/** Stage 2: visual ranking with angle-weighted pooling, returning the top-k matches. */
export function rankMonuments(
  query: number[],
  monuments: HeritageMonument[],
  fix: GeoFix | null,
  topK = 3,
): { matches: MonumentMatch[]; radiusM: number | null } {
  const { candidates, radiusM } = filterByGeo(monuments, fix);
  const scored = candidates
    .map(({ monument, distanceM }) => ({ monument, distanceM, ...angleWeightedSimilarity(query, monument) }))
    .sort((a, b) => b.score - a.score);

  const matches = scored.slice(0, topK).map((entry, index) => {
    const next = scored[index + 1];
    const margin = next ? entry.score - next.score : entry.score;
    return {
      monument: entry.monument,
      score: entry.score,
      maxAngleSimilarity: entry.maxAngleSimilarity,
      top3MeanSimilarity: entry.top3MeanSimilarity,
      bestAngle: entry.bestAngle,
      distanceM: entry.distanceM,
      confidence: classifyConfidence(entry.score, margin),
    };
  });
  return { matches, radiusM };
}

/** GPS-only fallback when no visual embedding is available (offline field mode without a model). */
export function rankByProximity(monuments: HeritageMonument[], fix: GeoFix, topK = 3): MonumentMatch[] {
  return monuments
    .map((monument) => ({ monument, distanceM: haversineMeters(fix, monument.geo) }))
    .sort((a, b) => a.distanceM - b.distanceM)
    .slice(0, topK)
    .map(({ monument, distanceM }) => {
      const insideGeofence = distanceM <= monument.geo.geofenceRadiusM;
      const score = Math.max(0, 1 - distanceM / (monument.geo.geofenceRadiusM * 4));
      return {
        monument,
        score,
        maxAngleSimilarity: 0,
        top3MeanSimilarity: 0,
        bestAngle: null,
        distanceM,
        confidence: insideGeofence ? 'MEDIUM' : 'LOW',
      } satisfies MonumentMatch;
    });
}
