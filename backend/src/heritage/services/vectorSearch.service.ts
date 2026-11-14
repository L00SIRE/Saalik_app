import {
  DEGRADED_SEARCH_RADIUS_M,
  DEGRADED_GPS_ACCURACY_M,
  SEARCH_RADIUS_M,
  filterByGeo,
  haversineMeters,
  isGpsDegraded,
  type GeoFilterResult,
} from './geo';
import {
  MAX_ANGLE_WEIGHT,
  TOP3_MEAN_WEIGHT,
  angleWeightedSimilarity,
  angleWeightedSimilarityForMonument,
  cosineSimilarity,
  l2Normalize,
  type PooledSimilarity,
} from './embeddings';
import type {
  CitedLoreChunk,
  GeoFix,
  MatchConfidence,
  MonumentMatch,
  MonumentRecord,
  NearbyTourAttachment,
  RagContextBundle,
  SourceCitation,
  WalkingTourRecord,
} from '../types/heritage';
import { SAALIK_EDITORIAL_CITATION } from '../types/heritage';

export {
  SEARCH_RADIUS_M,
  DEGRADED_SEARCH_RADIUS_M,
  DEGRADED_GPS_ACCURACY_M,
  haversineMeters,
  isGpsDegraded,
  filterByGeo,
};
export {
  MAX_ANGLE_WEIGHT,
  TOP3_MEAN_WEIGHT,
  cosineSimilarity,
  l2Normalize,
  angleWeightedSimilarity,
  angleWeightedSimilarityForMonument,
};
export type { PooledSimilarity, GeoFilterResult };

/** Walking-distance threshold for attaching active tours to a scan result. */
export const WALKING_TOUR_ATTACH_RADIUS_M = 2_500;

export function classifyConfidence(score: number, marginToNext: number): MatchConfidence {
  if (score >= 0.82 && marginToNext >= 0.04) return 'HIGH';
  if (score >= 0.65) return 'MEDIUM';
  return 'LOW';
}

export interface RankOptions {
  topK?: number;
  fix?: GeoFix | null;
}

export interface RankResult {
  matches: MonumentMatch[];
  radiusM: number | null;
  degraded: boolean;
}

/** Stage 1 + Stage 2: geo filter then angle-weighted cosine ranking. */
export function rankMonuments(
  query: number[],
  monuments: MonumentRecord[],
  options: RankOptions = {},
): RankResult {
  const topK = options.topK ?? 3;
  const fix = options.fix ?? null;
  const { candidates, radiusM, degraded } = filterByGeo(monuments, fix);

  const scored = candidates
    .map(({ monument, distanceM }) => {
      const pooled = angleWeightedSimilarityForMonument(query, monument);
      return { monument, distanceM, ...pooled };
    })
    .sort((a, b) => b.score - a.score);

  const matches: MonumentMatch[] = scored.slice(0, topK).map((entry, index) => {
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

  return { matches, radiusM, degraded };
}

/**
 * GPS-only fallback when no visual embedding is available
 * (offline field mode without a model, or degraded scan path).
 */
export function rankByProximity(
  monuments: MonumentRecord[],
  fix: GeoFix,
  topK = 3,
): MonumentMatch[] {
  return monuments
    .map((monument) => ({
      monument,
      distanceM: haversineMeters(fix, monument.geo),
    }))
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
        confidence: (insideGeofence ? 'MEDIUM' : 'LOW') as MatchConfidence,
      };
    });
}

export function resolveSourceCitations(
  sourceIds: string[],
  catalog: SourceCitation[],
): SourceCitation[] {
  const byId = new Map(catalog.map((s) => [s.id, s]));
  const resolved: SourceCitation[] = [];
  const seen = new Set<string>();

  for (const id of sourceIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    const hit = byId.get(id);
    if (hit) {
      resolved.push(hit);
    } else {
      resolved.push({ id, citation: `Heritage source reference: ${id}` });
    }
  }

  if (!seen.has(SAALIK_EDITORIAL_CITATION.id)) {
    resolved.push(SAALIK_EDITORIAL_CITATION);
  }

  return resolved;
}

/**
 * Attach active walking tours whose meeting point (or first stop geo via monuments)
 * is within walking distance of the matched monument.
 */
export function attachNearbyWalkingTours(
  monument: MonumentRecord,
  tours: WalkingTourRecord[],
  radiusM: number = WALKING_TOUR_ATTACH_RADIUS_M,
): NearbyTourAttachment[] {
  return tours
    .filter((tour) => tour.isActive)
    .map((tour) => {
      let distanceM: number | null = null;
      if (tour.meetingLat != null && tour.meetingLng != null) {
        distanceM = haversineMeters(monument.geo, {
          lat: tour.meetingLat,
          lng: tour.meetingLng,
        });
      } else if (tour.zoneId === monument.zoneId || tour.stopMonumentIds.includes(monument.id)) {
        distanceM = 0;
      }
      return { tour, distanceM };
    })
    .filter(({ distanceM }) => distanceM !== null && distanceM <= radiusM)
    .sort((a, b) => (a.distanceM ?? 0) - (b.distanceM ?? 0))
    .map(({ tour, distanceM }) => ({
      tourId: tour.tourId,
      title: tour.title,
      startPoint: tour.startPoint,
      distanceM,
      totalDurationMinutes: tour.totalDurationMinutes,
      stopMonumentIds: tour.stopMonumentIds,
    }));
}

export interface AssembleRagOptions {
  match: MonumentMatch;
  sourceCatalog: SourceCitation[];
  walkingTours: WalkingTourRecord[];
  maxLoreChunks?: number;
  tourRadiusM?: number;
}

/**
 * Stage 3: assemble hierarchical RAG context with source citations
 * (always including https://www.sumandangal.com/) and nearby walking tours.
 */
export function assembleHierarchicalRagContext(options: AssembleRagOptions): RagContextBundle {
  const { match, sourceCatalog, walkingTours } = options;
  const maxLoreChunks = options.maxLoreChunks ?? 5;
  const monument = match.monument;

  const lore: CitedLoreChunk[] = monument.loreChunks
    .slice()
    .sort((a, b) => {
      const order = ['HISTORY_DYNASTY', 'ARCHITECTURE_CRAFTSMANSHIP', 'ICONOGRAPHY_SYMBOLISM', 'LIVING_RITUALS_FOLKLORE', 'CONSERVATION_RESTORATION'];
      return order.indexOf(a.category) - order.indexOf(b.category);
    })
    .slice(0, maxLoreChunks)
    .map((chunk) => ({
      chunkId: chunk.chunkId,
      category: chunk.category,
      title: chunk.title,
      text: chunk.text,
      nodePath: chunk.nodePath || `${monument.nodePath}/${chunk.category.toLowerCase()}`,
      confidence: chunk.confidence,
      citations: resolveSourceCitations(chunk.sourceIds, sourceCatalog),
    }));

  return {
    monumentId: monument.id,
    monumentName: monument.names.en,
    nodePath: monument.nodePath,
    match,
    lore,
    editorialAttribution: SAALIK_EDITORIAL_CITATION,
    nearbyTours: attachNearbyWalkingTours(monument, walkingTours, options.tourRadiusM),
  };
}

export interface HybridScanRequest {
  queryEmbedding: number[] | null;
  fix: GeoFix | null;
  monuments: MonumentRecord[];
  walkingTours: WalkingTourRecord[];
  sourceCatalog: SourceCitation[];
  topK?: number;
  mode?: string;
}

export interface HybridScanResponse {
  source: 'cloud_visual' | 'gps_only';
  searchRadiusM: number | null;
  degraded: boolean;
  matches: MonumentMatch[];
  rag: RagContextBundle | null;
  notice: string | null;
}

/** Full hybrid pipeline used by the HTTP scan route and unit tests. */
export function hybridGeoVisualScan(request: HybridScanRequest): HybridScanResponse {
  const topK = request.topK ?? 3;

  if (!request.queryEmbedding || request.queryEmbedding.length === 0) {
    if (!request.fix) {
      return {
        source: 'gps_only',
        searchRadiusM: null,
        degraded: true,
        matches: [],
        rag: null,
        notice: 'No visual embedding and no GPS fix available.',
      };
    }
    const matches = rankByProximity(request.monuments, request.fix, topK);
    const top = matches[0] ?? null;
    return {
      source: 'gps_only',
      searchRadiusM: isGpsDegraded(request.fix) ? DEGRADED_SEARCH_RADIUS_M : SEARCH_RADIUS_M,
      degraded: isGpsDegraded(request.fix),
      matches,
      rag: top
        ? assembleHierarchicalRagContext({
            match: top,
            sourceCatalog: request.sourceCatalog,
            walkingTours: request.walkingTours,
          })
        : null,
      notice: 'Visual embedding unavailable; ranked by GPS proximity only.',
    };
  }

  const { matches, radiusM, degraded } = rankMonuments(request.queryEmbedding, request.monuments, {
    topK,
    fix: request.fix,
  });
  const top = matches[0] ?? null;

  return {
    source: 'cloud_visual',
    searchRadiusM: radiusM,
    degraded,
    matches,
    rag: top
      ? assembleHierarchicalRagContext({
          match: top,
          sourceCatalog: request.sourceCatalog,
          walkingTours: request.walkingTours,
        })
      : null,
    notice: degraded
      ? 'GPS accuracy degraded or sparse; search radius expanded to 10km.'
      : null,
  };
}
