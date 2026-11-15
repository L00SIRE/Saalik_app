import { haversineMeters } from '../vector/similarity';
import type { HeritageMonument } from '../../types/heritage';

/** About 4.2 km/h: an unhurried pace on crowded flagstones. */
export const WALK_SPEED_M_PER_MIN = 70;

export interface LatLng {
  lat: number;
  lng: number;
}

export interface WalkStop {
  monument: HeritageMonument;
  /** Walk from the previous stop, or from the start point for the first stop. */
  walkM: number;
  walkMinutes: number;
  dwellMinutes: number;
}

export interface HeritageWalk {
  stops: WalkStop[];
  totalDistanceM: number;
  totalMinutes: number;
  budgetMinutes: number;
}

function legs(start: LatLng, order: HeritageMonument[]): number[] {
  return order.map((monument, index) => haversineMeters(index === 0 ? start : order[index - 1]!.geo, monument.geo));
}

function totalMinutes(start: LatLng, order: HeritageMonument[]): number {
  const walk = legs(start, order).reduce((sum, metres) => sum + metres, 0) / WALK_SPEED_M_PER_MIN;
  return walk + order.reduce((sum, monument) => sum + monument.walkingTourStop.dwellMinutes, 0);
}

function nearestNeighbour(start: LatLng, monuments: HeritageMonument[]): HeritageMonument[] {
  const remaining = monuments.slice();
  const order: HeritageMonument[] = [];
  let here = start;
  while (remaining.length > 0) {
    let nearest = 0;
    for (let index = 1; index < remaining.length; index += 1) {
      if (haversineMeters(here, remaining[index]!.geo) < haversineMeters(here, remaining[nearest]!.geo)) nearest = index;
    }
    const [next] = remaining.splice(nearest, 1);
    order.push(next!);
    here = next!.geo;
  }
  return order;
}

/**
 * 2-opt for an open walk with a fixed start: reverse any stretch of the route whose reversal
 * shortens the total distance, and repeat until no reversal helps.
 */
export function twoOpt(start: LatLng, order: HeritageMonument[]): HeritageMonument[] {
  const route = order.slice();
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < route.length - 1; i += 1) {
      for (let j = i + 1; j < route.length; j += 1) {
        const before = i === 0 ? start : route[i - 1]!.geo;
        const after = route[j + 1]?.geo;
        const current = haversineMeters(before, route[i]!.geo) + (after ? haversineMeters(route[j]!.geo, after) : 0);
        const reversed = haversineMeters(before, route[j]!.geo) + (after ? haversineMeters(route[i]!.geo, after) : 0);
        if (reversed < current - 0.01) {
          route.splice(i, j - i + 1, ...route.slice(i, j + 1).reverse());
          improved = true;
        }
      }
    }
  }
  return route;
}

/**
 * Longest walk that fits the time budget: takes the monuments nearest the start one at a time,
 * re-orders them with nearest-neighbour plus 2-opt, and stops before the stop that would run over.
 */
export function buildHeritageWalk(start: LatLng, candidates: HeritageMonument[], budgetMinutes = 90): HeritageWalk {
  const byDistance = candidates
    .slice()
    .sort((a, b) => haversineMeters(start, a.geo) - haversineMeters(start, b.geo));

  let best: HeritageMonument[] = [];
  for (let count = 1; count <= byDistance.length; count += 1) {
    const order = twoOpt(start, nearestNeighbour(start, byDistance.slice(0, count)));
    if (totalMinutes(start, order) > budgetMinutes) break;
    best = order;
  }

  const distances = legs(start, best);
  return {
    stops: best.map((monument, index) => ({
      monument,
      walkM: distances[index]!,
      walkMinutes: distances[index]! / WALK_SPEED_M_PER_MIN,
      dwellMinutes: monument.walkingTourStop.dwellMinutes,
    })),
    totalDistanceM: distances.reduce((sum, metres) => sum + metres, 0),
    totalMinutes: totalMinutes(start, best),
    budgetMinutes,
  };
}
