import { haversineMeters } from '../services/vector/similarity';
import type { GeoFix, HeritageMonument, HeritageWalkingTour } from '../types/heritage';
import type { MonumentRepository } from './MonumentRepository';

export interface WalkingTourStopView {
  monument: HeritageMonument;
  sequence: number;
  dwellMinutes: number;
  talkingPoint: string;
  legModeToNext: 'walk' | 'drive' | null;
  minutesToNext: number | null;
  distanceToNextM: number | null;
}

/** Free self-guided heritage walking routes compiled from the seed corpus. */
export class WalkingTourRepository {
  constructor(private readonly monuments: MonumentRepository) {}

  getAll(): HeritageWalkingTour[] {
    return this.monuments.getBundledWalkingTours();
  }

  getById(tourId: string): HeritageWalkingTour | undefined {
    return this.getAll().find((t) => t.tourId === tourId);
  }

  getForZone(zoneId: string): HeritageWalkingTour | undefined {
    return this.getAll().find((t) => t.zoneId === zoneId);
  }

  getStops(tourId: string): WalkingTourStopView[] {
    const tour = this.getById(tourId);
    if (!tour) return [];
    return tour.stopMonumentIds
      .map((id) => this.monuments.getById(id))
      .filter((m): m is HeritageMonument => Boolean(m))
      .map((monument) => ({
        monument,
        sequence: monument.walkingTourStop.sequence,
        dwellMinutes: monument.walkingTourStop.dwellMinutes,
        talkingPoint: monument.walkingTourStop.talkingPoint,
        legModeToNext: monument.walkingTourStop.legModeToNext,
        minutesToNext: monument.walkingTourStop.minutesToNext,
        distanceToNextM: monument.walkingTourStop.distanceToNextM,
      }))
      .sort((a, b) => a.sequence - b.sequence);
  }

  /** Tours with at least one stop within walking distance of the given point. */
  getToursNear(fix: { lat: number; lng: number } | GeoFix, radiusM = 1500): { tour: HeritageWalkingTour; nearestStopM: number }[] {
    return this.getAll()
      .map((tour) => {
        const distances = tour.stopMonumentIds
          .map((id) => this.monuments.getById(id))
          .filter((m): m is HeritageMonument => Boolean(m))
          .map((m) => haversineMeters(fix, m.geo));
        return { tour, nearestStopM: distances.length ? Math.min(...distances) : Number.POSITIVE_INFINITY };
      })
      .filter((entry) => entry.nearestStopM <= radiusM)
      .sort((a, b) => a.nearestStopM - b.nearestStopM);
  }
}
