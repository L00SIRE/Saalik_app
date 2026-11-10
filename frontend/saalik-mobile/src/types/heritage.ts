// ============================================
// SAALIK HERITAGE - SHARED TYPES
// Mirrors the bundle compiled by data/nepal_heritage_seed/validate_and_compile.ts
// ============================================

export type AppMode = 'LIVE_CLOUD' | 'OFFLINE_FIELD_SYNC' | 'NTB_VIP_DEMO_MODE';

export const APP_MODES: AppMode[] = ['LIVE_CLOUD', 'OFFLINE_FIELD_SYNC', 'NTB_VIP_DEMO_MODE'];

export const APP_MODE_LABELS: Record<AppMode, { title: string; description: string }> = {
  LIVE_CLOUD: {
    title: 'Live Cloud',
    description: 'Scans and lore come from the Saalik API; captures upload whenever you are online.',
  },
  OFFLINE_FIELD_SYNC: {
    title: 'Offline Field Sync',
    description: 'Works without signal. Captures queue on the device and upload automatically on Wi-Fi.',
  },
  NTB_VIP_DEMO_MODE: {
    title: 'NTB VIP Demo',
    description: 'Fully on-device: bundled corpus, vector matching and story streaming in Airplane Mode.',
  },
};

export type CaptureAngle =
  | 'ESTABLISHING_FRONT'
  | 'LEFT_45'
  | 'RIGHT_45'
  | 'CLOSE_UP_ICONOGRAPHY'
  | 'WIDE_COURTYARD_CONTEXT';

export const CAPTURE_ANGLES: CaptureAngle[] = [
  'ESTABLISHING_FRONT',
  'LEFT_45',
  'RIGHT_45',
  'CLOSE_UP_ICONOGRAPHY',
  'WIDE_COURTYARD_CONTEXT',
];

export const CAPTURE_ANGLE_LABELS: Record<CaptureAngle, string> = {
  ESTABLISHING_FRONT: 'Establishing Front',
  LEFT_45: '45-Degree Left',
  RIGHT_45: '45-Degree Right',
  CLOSE_UP_ICONOGRAPHY: 'Close-Up Iconography/Inscription',
  WIDE_COURTYARD_CONTEXT: 'Wide Courtyard Context',
};

export type LoreCategory =
  | 'HISTORY_DYNASTY'
  | 'ARCHITECTURE_CRAFTSMANSHIP'
  | 'ICONOGRAPHY_SYMBOLISM'
  | 'LIVING_RITUALS_FOLKLORE'
  | 'CONSERVATION_RESTORATION';

export type LightingTag = 'DIRECT_SUN' | 'COURTYARD_SHADOW' | 'OVERCAST' | 'DUSK_LAMP';

export const LIGHTING_TAGS: { key: LightingTag; label: string }[] = [
  { key: 'DIRECT_SUN', label: 'Direct Sun' },
  { key: 'COURTYARD_SHADOW', label: 'Courtyard Shadow' },
  { key: 'OVERCAST', label: 'Overcast' },
  { key: 'DUSK_LAMP', label: 'Dusk/Lamp' },
];

export interface BilingualName {
  en: string;
  ne: string;
  romanized: string;
  romanizedLanguage: string;
}

export interface HeritageLoreChunk {
  chunkId: string;
  category: LoreCategory;
  categoryLabel: string;
  title: string;
  text: string;
  sourceIds: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface ReferenceEmbedding {
  angle: CaptureAngle;
  vector: number[];
}

export interface HeritageTourStop {
  tourId: string;
  sequence: number;
  dwellMinutes: number;
  talkingPoint: string;
  nextMonumentId: string | null;
  distanceToNextM: number | null;
  legModeToNext: 'walk' | 'drive' | null;
  minutesToNext: number | null;
}

export interface FieldPhotoSpec {
  bestTimeOfDay: string;
  localTimeWindow: string;
  lightingNotes: string;
  angles: { angle: CaptureAngle; framingNote: string }[];
  occlusionNotes: string;
  restrictions: string;
}

export interface HeritageMonument {
  id: string;
  zoneId: string;
  subZone: string | null;
  names: BilingualName;
  monumentType: string;
  tradition: string;
  era: { dynasty: string; century: string; foundingYearCE: number | null };
  geo: { lat: number; lng: number; elevationM: number; geofenceRadiusM: number };
  visualCues: {
    roofTiers: number;
    primaryMaterials: string[];
    distinguishingFeatures: string[];
    confusableWith: string[];
    disambiguationTip: string;
  };
  audioHook: { script: string; estimatedSeconds: number; wordCount: number };
  nepaliSummary: string;
  fieldPhotoSpec: FieldPhotoSpec;
  walkingTourStop: HeritageTourStop;
  verificationStatus: string;
  loreChunks: HeritageLoreChunk[];
  referenceEmbeddings: ReferenceEmbedding[];
}

export interface HeritageZone {
  zoneId: string;
  names: BilingualName;
  designation: 'UNESCO_MONUMENT_ZONE' | 'SATELLITE_HERITAGE_TOWNS';
  centroid: { lat: number; lng: number };
  monumentIds: string[];
  walkingTourId: string;
}

export interface HeritageWalkingTour {
  tourId: string;
  zoneId: string;
  title: string;
  titleNe: string;
  startPoint: string;
  bestStartTime: string;
  stopMonumentIds: string[];
  totalDistanceM: number;
  totalDurationMinutes: number;
}

export interface HeritageSource {
  id: string;
  citation: string;
}

export interface HeritageSeedBundle {
  corpusId: string;
  version: string;
  generatedAt: string;
  embeddingModel: { id: string; dimensions: number; description: string };
  sources: HeritageSource[];
  zones: HeritageZone[];
  walkingTours: HeritageWalkingTour[];
  monuments: HeritageMonument[];
}

export interface GeoFix {
  lat: number;
  lng: number;
  accuracyM: number | null;
  altitudeM?: number | null;
  headingDeg?: number | null;
}

export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface MonumentMatch {
  monument: HeritageMonument;
  score: number;
  maxAngleSimilarity: number;
  top3MeanSimilarity: number;
  bestAngle: CaptureAngle | null;
  distanceM: number | null;
  confidence: MatchConfidence;
}

export interface ScanResult {
  source: 'cloud_visual' | 'on_device_demo' | 'gps_only';
  searchRadiusM: number | null;
  matches: MonumentMatch[];
  notice: string | null;
}

export type CaptureStatus = 'PENDING' | 'UPLOADING' | 'RETRY_SCHEDULED' | 'UPLOADED' | 'FAILED';

export interface FieldCapture {
  clientCaptureId: string;
  monumentId: string;
  zoneId: string;
  angle: CaptureAngle;
  photoUri: string;
  voiceNoteUri: string | null;
  latitude: number | null;
  longitude: number | null;
  altitudeM: number | null;
  gpsAccuracyM: number | null;
  headingDeg: number | null;
  lightingTag: LightingTag;
  notes: string | null;
  capturedAt: string;
  status: CaptureStatus;
  attempts: number;
  nextAttemptAt: string | null;
  lastError: string | null;
  serverId: string | null;
  uploadedAt: string | null;
}

export type NewFieldCapture = Omit<
  FieldCapture,
  'status' | 'attempts' | 'nextAttemptAt' | 'lastError' | 'serverId' | 'uploadedAt'
>;
