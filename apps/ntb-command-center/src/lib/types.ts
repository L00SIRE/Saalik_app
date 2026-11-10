export type Designation = "UNESCO_MONUMENT_ZONE" | "SATELLITE_HERITAGE_TOWNS";

export type RagStatus = "ready" | "partial" | "gap";

export type AlertSeverity = "info" | "advisory" | "warning" | "critical";

export interface OverviewMetrics {
  generatedAt: string;
  mode: string;
  corpusVersion: string;
  zoneCount: number;
  monumentCount: number;
  unescoZones: number;
  satelliteZones: number;
  scansValley24h: number;
  activeAlerts: number;
  guideRevenueNpr7d: number;
  meanVectorSeparation: number;
  bilingualReadyPct: number;
  dispersionGap: number;
}

export interface ZoneMetrics {
  scansLast24h: number;
  scansLast7d: number;
  uniqueVisitorsEst: number;
  congestionIndex: number;
  dispersionScore: number;
  unseenSitesCreatorVisits: number;
  avgDwellMinutes: number;
}

export interface ZoneRecord {
  zoneId: string;
  nameEn: string;
  nameNe: string;
  designation: Designation;
  unescoReference: string | null;
  district: string;
  centroid: { lat: number; lng: number };
  description: string;
  monumentCount: number;
  walkingTour: {
    tourId: string;
    title: string;
    titleNe: string;
    startPoint: string;
    bestStartTime: string;
  };
  metrics: ZoneMetrics;
}

export interface LoreChunk {
  category: string;
  title: string;
  excerpt: string;
  confidence: string;
  sourceIds: string[];
}

export interface EmbeddingHealth {
  angleCoverage: Record<string, number>;
  meanAngleCoverage: number;
  vectorSeparationScore: number;
  ragStatusEn: RagStatus;
  ragStatusNe: RagStatus;
  ragCompletenessEn: number;
  ragCompletenessNe: number;
  referenceVectors: number;
}

export interface MonumentRecord {
  id: string;
  zoneId: string;
  zoneName: string;
  nameEn: string;
  nameNe: string;
  romanized: string;
  monumentType: string;
  tradition: string;
  dynasty: string;
  century: string;
  lat: number;
  lng: number;
  geofenceRadiusM: number;
  municipality: string;
  district: string;
  subZone?: string | null;
  verification: string;
  materials: string[];
  features: string[];
  confusableWith: string[];
  disambiguationTip: string;
  lore: LoreChunk[];
  audioHook: string;
  nepaliSummary: string;
  tourSequence: number;
  dwellMinutes: number;
  talkingPoint: string;
  embeddingHealth: EmbeddingHealth;
  scansLast7d: number;
}

export interface GuideRecord {
  id: string;
  name: string;
  homeBase: string;
  licenseId: string;
  credentialBody: "NTB" | "TAAN" | string;
  languages: string[];
  zonesServed: string[];
  scansAttributed7d: number;
  bookingConversionRate: number;
  walkingToursBooked7d: number;
  tipRevenueNpr7d: number;
  tourFeeRevenueNpr7d: number;
  livelihoodIndex: number;
}

export interface AlertRecord {
  id: string;
  severity: AlertSeverity;
  category: string;
  title: string;
  body: string;
  zones: string[];
  geofenceIds: string[];
  active: boolean;
  issuedAt: string;
  expiresAt: string;
  audience: string[];
}

export interface SandboxMatch {
  monumentId: string;
  nameEn: string;
  cosineSimilarity: number;
  zoneId: string;
}

export interface SandboxQuery {
  queryMonumentId: string;
  photoLabel: string;
  matches: SandboxMatch[];
  topCitations: Array<{
    nodePath: string;
    title: string;
    category: string;
    confidence: string;
    excerpt: string;
    sourceIds: string[];
  }>;
  mobilePreview: {
    headline: string;
    headlineNe: string;
    audioHook: string;
    nepaliSummary: string;
    guideCta: string;
    dwellSuggestionMin: number;
  };
}

export interface DashboardData {
  overview: OverviewMetrics;
  zones: ZoneRecord[];
  monuments: MonumentRecord[];
  guides: GuideRecord[];
  alerts: AlertRecord[];
  hourlyScans: Array<Record<string, string | number>>;
  sandboxQueries: SandboxQuery[];
  captureAngles: string[];
  loreCategories: string[];
}
