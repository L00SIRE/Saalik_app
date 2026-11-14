/** Shared heritage domain types for the Hybrid Geo-Visual API (DB-free). */

export type CaptureAngle =
  | 'ESTABLISHING_FRONT'
  | 'LEFT_45'
  | 'RIGHT_45'
  | 'CLOSE_UP_ICONOGRAPHY'
  | 'WIDE_COURTYARD_CONTEXT';

export type LoreCategory =
  | 'HISTORY_DYNASTY'
  | 'ARCHITECTURE_CRAFTSMANSHIP'
  | 'ICONOGRAPHY_SYMBOLISM'
  | 'LIVING_RITUALS_FOLKLORE'
  | 'CONSERVATION_RESTORATION';

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export type CaptureSubmissionStatus =
  | 'PENDING'
  | 'UPLOADING'
  | 'RETRY_SCHEDULED'
  | 'UPLOADED'
  | 'FAILED';

export type LightingTag = 'DIRECT_SUN' | 'COURTYARD_SHADOW' | 'OVERCAST' | 'DUSK_LAMP';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface GeoFix extends GeoPoint {
  accuracyM: number | null;
  altitudeM?: number | null;
  headingDeg?: number | null;
}

export interface SourceCitation {
  id: string;
  citation: string;
  url?: string;
}

export interface LoreChunk {
  chunkId: string;
  category: LoreCategory;
  title: string;
  text: string;
  sourceIds: string[];
  confidence: 'high' | 'medium' | 'low';
  nodePath: string;
  embedding?: number[];
}

export interface ReferenceEmbedding {
  angle: CaptureAngle;
  vector: number[];
}

export interface MonumentRecord {
  id: string;
  zoneId: string;
  nodePath: string;
  names: { en: string; ne: string; romanized?: string };
  monumentType: string;
  tradition: string;
  geo: GeoPoint & { elevationM?: number; geofenceRadiusM: number };
  visualCues: {
    confusableWith: string[];
    disambiguationTip?: string;
  };
  loreChunks: LoreChunk[];
  referenceEmbeddings: ReferenceEmbedding[];
}

export interface WalkingTourRecord {
  tourId: string;
  zoneId: string;
  title: string;
  titleNe?: string;
  startPoint: string;
  meetingLat?: number | null;
  meetingLng?: number | null;
  stopMonumentIds: string[];
  totalDistanceM: number;
  totalDurationMinutes: number;
  isActive: boolean;
}

export interface MonumentMatch {
  monument: MonumentRecord;
  score: number;
  maxAngleSimilarity: number;
  top3MeanSimilarity: number;
  bestAngle: CaptureAngle | null;
  distanceM: number | null;
  confidence: MatchConfidence;
}

export interface CitedLoreChunk {
  chunkId: string;
  category: LoreCategory;
  title: string;
  text: string;
  nodePath: string;
  confidence: 'high' | 'medium' | 'low';
  citations: SourceCitation[];
}

export interface NearbyTourAttachment {
  tourId: string;
  title: string;
  startPoint: string;
  distanceM: number | null;
  totalDurationMinutes: number;
  stopMonumentIds: string[];
}

export interface RagContextBundle {
  monumentId: string;
  monumentName: string;
  nodePath: string;
  match: MonumentMatch;
  lore: CitedLoreChunk[];
  editorialAttribution: SourceCitation;
  nearbyTours: NearbyTourAttachment[];
}

export const SAALIK_EDITORIAL_CITATION: SourceCitation = {
  id: 'sumandangal_com',
  citation:
    'Saalik editorial heritage synthesis and field methodology — Sumandan Gal / Saalik (https://www.sumandangal.com/).',
  url: 'https://www.sumandangal.com/',
};
