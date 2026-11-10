import type { GeoFix, GeoPoint, MonumentRecord } from '../types/heritage';

/** Default Haversine radius inside Durbar Squares and dense UNESCO zones. */
export const SEARCH_RADIUS_M = 350;

/** Expanded radius when GPS accuracy is degraded or the tight radius returns no hits. */
export const DEGRADED_SEARCH_RADIUS_M = 10_000;

/** Accuracy threshold (meters) above which we treat the fix as degraded. */
export const DEGRADED_GPS_ACCURACY_M = 50;

/** Earth mean radius used by haversineMeters. */
const EARTH_RADIUS_M = 6_371_000;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance in meters between two WGS84 points. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}

export function isGpsDegraded(fix: GeoFix | null): boolean {
  if (!fix) return true;
  return fix.accuracyM === null || fix.accuracyM > DEGRADED_GPS_ACCURACY_M;
}

export interface GeoFilterCandidate {
  monument: MonumentRecord;
  distanceM: number | null;
}

export interface GeoFilterResult {
  candidates: GeoFilterCandidate[];
  radiusM: number | null;
  degraded: boolean;
}

/**
 * Stage 1 GPS filter.
 * - Accurate fix: keep monuments within 350m (+ per-monument geofence).
 * - Degraded accuracy or empty tight set: expand to 10km.
 * - Missing fix: pass all monuments through (visual-only ranking).
 */
export function filterByGeo(monuments: MonumentRecord[], fix: GeoFix | null): GeoFilterResult {
  if (!fix) {
    return {
      candidates: monuments.map((monument) => ({ monument, distanceM: null })),
      radiusM: null,
      degraded: true,
    };
  }

  const withDistance = monuments.map((monument) => ({
    monument,
    distanceM: haversineMeters(fix, monument.geo),
  }));

  const degraded = isGpsDegraded(fix);
  const primaryRadius = degraded ? DEGRADED_SEARCH_RADIUS_M : SEARCH_RADIUS_M;

  let inside = withDistance.filter(
    (c) => (c.distanceM ?? Number.POSITIVE_INFINITY) <= primaryRadius + c.monument.geo.geofenceRadiusM,
  );
  let radiusM = primaryRadius;

  if (inside.length === 0 && !degraded) {
    radiusM = DEGRADED_SEARCH_RADIUS_M;
    inside = withDistance.filter((c) => (c.distanceM ?? Number.POSITIVE_INFINITY) <= radiusM);
  }

  return { candidates: inside, radiusM, degraded: degraded || radiusM === DEGRADED_SEARCH_RADIUS_M };
}
