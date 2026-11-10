import type { Database } from '../services/storage/database';
import { searchTours } from '../services/api';
import { haversineMeters } from '../services/vector/similarity';
import type { Tour } from '../types/api';
import type { HeritageMonument } from '../types/heritage';

const ZONE_HUBS: Record<string, string[]> = {
  kathmandu_durbar: ['Kathmandu'],
  swayambhunath: ['Kathmandu'],
  boudhanath: ['Kathmandu'],
  pashupatinath: ['Kathmandu'],
  patan_durbar: ['Patan', 'Kathmandu'],
  bhaktapur_durbar: ['Bhaktapur'],
  changu_narayan: ['Bhaktapur'],
  hidden_gems_kirtipur_panauti_bungamati: ['Kathmandu', 'Patan'],
};

const ZONE_KEYWORDS: Record<string, string[]> = {
  kathmandu_durbar: ['kathmandu durbar', 'hanuman', 'kumari', 'basantapur'],
  swayambhunath: ['swayambhu', 'monkey temple'],
  boudhanath: ['boudha', 'boudhanath', 'stupa'],
  pashupatinath: ['pashupati'],
  patan_durbar: ['patan', 'lalitpur'],
  bhaktapur_durbar: ['bhaktapur', 'nyatapola', 'pottery'],
  changu_narayan: ['changu'],
  hidden_gems_kirtipur_panauti_bungamati: ['kirtipur', 'bungamati', 'khokana', 'panauti', 'pharping', 'sankhu'],
};

const NEARBY_MEETING_POINT_M = 3000;

export interface StorytellerOffer {
  tour: Tour;
  distanceM: number | null;
  reason: 'meeting_point_nearby' | 'keyword_match' | 'same_hub';
  isVerifiedGuide: boolean;
  isFree: boolean;
}

/** Offline-first cache of marketplace tours and verified guides, ranked by proximity to a monument. */
export class GuideMarketplaceRepository {
  private memoryTours: Tour[] = [];

  constructor(private readonly db: Database | null) {}

  async getCachedTours(): Promise<Tour[]> {
    if (!this.db) return this.memoryTours;
    const rows = await this.db.getAllAsync<{ payload: string }>('SELECT payload FROM marketplace_tours');
    return rows.map((r) => JSON.parse(r.payload) as Tour);
  }

  /** Refreshes from the API (mock or live) and caches; falls back to the cache when offline. */
  async refresh(): Promise<Tour[]> {
    try {
      const tours = await searchTours();
      await this.cacheTours(tours);
      return tours;
    } catch (error) {
      const cached = await this.getCachedTours();
      if (cached.length === 0) throw error;
      return cached;
    }
  }

  private async cacheTours(tours: Tour[]): Promise<void> {
    if (!this.db) {
      this.memoryTours = tours;
      return;
    }
    const now = new Date().toISOString();
    await this.db.withExclusiveTransactionAsync(async (txn) => {
      for (const tour of tours) {
        await txn.runAsync(
          `INSERT INTO marketplace_tours (id, hub, meeting_lat, meeting_lng, payload, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET hub = excluded.hub, meeting_lat = excluded.meeting_lat,
             meeting_lng = excluded.meeting_lng, payload = excluded.payload, updated_at = excluded.updated_at`,
          tour.id,
          tour.hub,
          tour.meetingLat ?? null,
          tour.meetingLng ?? null,
          JSON.stringify(tour),
          now,
        );
      }
    });
  }

  async findStorytellersNear(monument: HeritageMonument, limit = 3): Promise<StorytellerOffer[]> {
    let tours = await this.getCachedTours();
    if (tours.length === 0) {
      tours = await this.refresh().catch(() => []);
    }
    const hubs = ZONE_HUBS[monument.zoneId] ?? [];
    const keywords = ZONE_KEYWORDS[monument.zoneId] ?? [];

    const offers = tours
      .filter((tour) => tour.isActive)
      .map((tour): (StorytellerOffer & { rank: number }) | null => {
        const text = `${tour.title} ${tour.description} ${tour.meetingPoint}`.toLowerCase();
        const distanceM =
          tour.meetingLat !== undefined && tour.meetingLng !== undefined
            ? haversineMeters(monument.geo, { lat: tour.meetingLat, lng: tour.meetingLng })
            : null;
        const base = { tour, distanceM, isVerifiedGuide: tour.guide?.isVerified ?? false, isFree: true };
        if (distanceM !== null && distanceM <= NEARBY_MEETING_POINT_M) {
          return { ...base, reason: 'meeting_point_nearby', rank: distanceM };
        }
        if (keywords.some((k) => text.includes(k))) {
          return { ...base, reason: 'keyword_match', rank: NEARBY_MEETING_POINT_M + 1 };
        }
        if (hubs.includes(tour.hub)) {
          return { ...base, reason: 'same_hub', rank: NEARBY_MEETING_POINT_M * 2 + (5 - tour.rating) * 100 };
        }
        return null;
      })
      .filter((offer): offer is StorytellerOffer & { rank: number } => offer !== null)
      .sort((a, b) => a.rank - b.rank || b.tour.rating - a.tour.rating);

    return offers.slice(0, limit).map(({ rank: _rank, ...offer }) => offer);
  }
}
