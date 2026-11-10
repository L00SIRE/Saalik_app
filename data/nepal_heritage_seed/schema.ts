import { z } from 'zod';

// ============================================
// CONSTANTS & ENUMERATIONS
// ============================================

export const LORE_CATEGORIES = [
  'HISTORY_DYNASTY',
  'ARCHITECTURE_CRAFTSMANSHIP',
  'ICONOGRAPHY_SYMBOLISM',
  'LIVING_RITUALS_FOLKLORE',
  'CONSERVATION_RESTORATION',
] as const;
export type LoreCategory = (typeof LORE_CATEGORIES)[number];

export const LORE_CATEGORY_LABELS: Record<LoreCategory, string> = {
  HISTORY_DYNASTY: 'History & Dynasty',
  ARCHITECTURE_CRAFTSMANSHIP: 'Architecture & Craftsmanship',
  ICONOGRAPHY_SYMBOLISM: 'Iconography & Deity Symbolism',
  LIVING_RITUALS_FOLKLORE: 'Living Rituals & Tantric Folklore',
  CONSERVATION_RESTORATION: 'Conservation & Post-2015 Restoration',
};

export const CAPTURE_ANGLES = [
  'ESTABLISHING_FRONT',
  'LEFT_45',
  'RIGHT_45',
  'CLOSE_UP_ICONOGRAPHY',
  'WIDE_COURTYARD_CONTEXT',
] as const;
export type CaptureAngle = (typeof CAPTURE_ANGLES)[number];

export const CAPTURE_ANGLE_LABELS: Record<CaptureAngle, string> = {
  ESTABLISHING_FRONT: 'Establishing Front',
  LEFT_45: '45-Degree Left',
  RIGHT_45: '45-Degree Right',
  CLOSE_UP_ICONOGRAPHY: 'Close-Up Iconography/Inscription',
  WIDE_COURTYARD_CONTEXT: 'Wide Courtyard Context',
};

export const DYNASTIES = ['Kirata', 'Licchavi', 'Thakuri', 'Malla', 'Shah', 'Rana', 'Modern'] as const;
export const DATING_BASIS = ['inscription', 'chronicle', 'tradition', 'architectural_style', 'archaeological', 'documented_record'] as const;

export const MONUMENT_TYPES = [
  'PAGODA_TEMPLE',
  'SHIKHARA_TEMPLE',
  'DOME_TEMPLE',
  'STUPA',
  'CHAITYA',
  'PALACE',
  'PALACE_COURTYARD',
  'MONASTERY',
  'PILLAR_STATUE',
  'ROYAL_STATUE',
  'STONE_RELIEF',
  'STONE_IMAGE',
  'INSCRIPTION',
  'BELL',
  'MASK_SHRINE',
  'WATER_SPOUT',
  'POND',
  'SHRINE',
  'CREMATION_GHAT',
  'REST_HOUSE',
  'HERITAGE_TRAIL',
  'VIEWPOINT',
  'MUSEUM_COURTYARD',
  'ARCADE',
  'RESIDENCE',
  'GATEWAY',
  'PILGRIM_COMPLEX',
  'LIVING_CRAFT_SQUARE',
  'MONUMENTAL_STATUE',
] as const;
export type MonumentType = (typeof MONUMENT_TYPES)[number];

export const RELIGIOUS_TRADITIONS = ['HINDU', 'BUDDHIST', 'SHARED_HINDU_BUDDHIST', 'CIVIC_ROYAL'] as const;

export const MATERIALS = [
  'carved_brick',
  'fired_brick',
  'black_stone',
  'grey_stone',
  'sandstone',
  'gilt_repousse_copper',
  'gilt_bronze',
  'bronze',
  'brass',
  'silver',
  'wood',
  'carved_wood',
  'whitewash_lime',
  'stucco',
  'terracotta',
  'clay_tile',
  'iron',
  'marble',
  'gold_leaf',
  'reinforced_concrete',
  'earth_and_stone',
] as const;

export const TIMES_OF_DAY = ['EARLY_MORNING', 'GOLDEN_HOUR_MORNING', 'LATE_AFTERNOON_GOLDEN', 'OVERCAST_MIDDAY'] as const;
export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;
export const VERIFICATION_STATUSES = ['EDITORIAL_DRAFT', 'FIELD_VERIFIED', 'CUSTODIAN_APPROVED'] as const;
export const COORDINATE_PRECISIONS = ['approximate_desk_research', 'field_gps_verified', 'survey_grade'] as const;
export const DISTRICTS = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Kavrepalanchok'] as const;

export const LORE_WORD_RANGE = { min: 120, max: 200 } as const;
// Spoken narration pace used to estimate audio-hook duration.
export const AUDIO_HOOK_PACE = { wordsPerMinute: 130, minSeconds: 50, maxSeconds: 75 } as const;
export const GEOFENCE_RANGE_M = { min: 15, max: 150 } as const;
export const KATHMANDU_VALLEY_BOUNDS = { minLat: 27.55, maxLat: 27.8, minLng: 85.2, maxLng: 85.56 } as const;
export const GUIDE_PROMPT_PATTERN = /\b(guide|storyteller)s?\b/i;

// ============================================
// HELPERS
// ============================================

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function estimateNarrationSeconds(text: string): number {
  return Math.round((countWords(text) / AUDIO_HOOK_PACE.wordsPerMinute) * 60);
}

export function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function lastSentence(text: string): string {
  const sentences = text.trim().split(/(?<=[.!?])\s+/);
  return sentences[sentences.length - 1] ?? '';
}

// ============================================
// PRIMITIVE SCHEMAS
// ============================================

export const SlugIdSchema = z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/, 'ids must be lower_snake_case');
const DevanagariText = z.string().min(2).regex(/[\u0900-\u097F]/, 'must contain Devanagari script');

export const BilingualNameSchema = z.object({
  en: z.string().min(3),
  ne: DevanagariText,
  romanized: z.string().min(2),
  romanizedLanguage: z.enum(['Newa', 'Nepali', 'Tibetan', 'Sanskrit']),
});

export const LatLngSchema = z.object({
  lat: z.number().min(KATHMANDU_VALLEY_BOUNDS.minLat).max(KATHMANDU_VALLEY_BOUNDS.maxLat),
  lng: z.number().min(KATHMANDU_VALLEY_BOUNDS.minLng).max(KATHMANDU_VALLEY_BOUNDS.maxLng),
});

// ============================================
// SOURCE REGISTRY
// ============================================

export const SourceSchema = z.object({
  id: SlugIdSchema,
  type: z.enum(['official_listing', 'institution', 'book', 'chronicle', 'editorial']),
  citation: z.string().min(10),
  url: z.url().optional(),
});
export type Source = z.infer<typeof SourceSchema>;

export const SourceRegistrySchema = z
  .object({
    version: z.string(),
    attributionPolicy: z.string().min(40),
    sources: z.array(SourceSchema).min(5),
  })
  .superRefine((registry, ctx) => {
    const seen = new Set<string>();
    registry.sources.forEach((source, index) => {
      if (seen.has(source.id)) {
        ctx.addIssue({ code: 'custom', path: ['sources', index, 'id'], message: `duplicate source id ${source.id}` });
      }
      seen.add(source.id);
    });
  });
export type SourceRegistry = z.infer<typeof SourceRegistrySchema>;

// ============================================
// HIERARCHY: Zone -> Monument -> VisualIdentificationCues
//   -> HierarchicalLoreChunk -> FieldPhotoCaptureSpec -> SuggestedWalkingTourStop
// ============================================

export const GeoMetadataSchema = LatLngSchema.extend({
  elevationM: z.number().int().min(1200).max(1800),
  geofenceRadiusM: z.number().int().min(GEOFENCE_RANGE_M.min).max(GEOFENCE_RANGE_M.max),
  municipality: z.string().min(3),
  district: z.enum(DISTRICTS),
  ward: z.number().int().positive().nullable(),
  coordinatePrecision: z.enum(COORDINATE_PRECISIONS),
});
export type GeoMetadata = z.infer<typeof GeoMetadataSchema>;

export const EraSchema = z.object({
  dynasty: z.enum(DYNASTIES),
  century: z.string().regex(/(century|centuries)/i, 'describe the century, e.g. "17th century CE"'),
  foundingYearCE: z.number().int().min(-600).max(2030).nullable(),
  datingBasis: z.enum(DATING_BASIS),
  patron: z.string().min(2).nullable(),
});

export const VisualIdentificationCuesSchema = z.object({
  roofTiers: z.number().int().min(0).max(5),
  primaryMaterials: z.array(z.enum(MATERIALS)).min(1),
  guardianVahanas: z.array(z.string().min(2)),
  deityMudrasWeapons: z.array(z.string().min(2)),
  distinguishingFeatures: z.array(z.string().min(8)).min(2),
  confusableWith: z.array(SlugIdSchema),
  disambiguationTip: z.string().min(30),
});
export type VisualIdentificationCues = z.infer<typeof VisualIdentificationCuesSchema>;

export const HierarchicalLoreChunkSchema = z
  .object({
    category: z.enum(LORE_CATEGORIES),
    title: z.string().min(4),
    text: z.string(),
    sourceIds: z.array(SlugIdSchema).min(1),
    confidence: z.enum(CONFIDENCE_LEVELS),
  })
  .superRefine((chunk, ctx) => {
    const words = countWords(chunk.text);
    if (words < LORE_WORD_RANGE.min || words > LORE_WORD_RANGE.max) {
      ctx.addIssue({
        code: 'custom',
        path: ['text'],
        message: `lore chunk "${chunk.title}" has ${words} words; expected ${LORE_WORD_RANGE.min}-${LORE_WORD_RANGE.max}`,
      });
    }
  });
export type HierarchicalLoreChunk = z.infer<typeof HierarchicalLoreChunkSchema>;

export const AudioHookSchema = z
  .object({
    script: z.string(),
  })
  .superRefine((hook, ctx) => {
    const seconds = estimateNarrationSeconds(hook.script);
    if (seconds < AUDIO_HOOK_PACE.minSeconds || seconds > AUDIO_HOOK_PACE.maxSeconds) {
      ctx.addIssue({
        code: 'custom',
        path: ['script'],
        message: `audio hook narrates in ~${seconds}s (${countWords(hook.script)} words); expected ${AUDIO_HOOK_PACE.minSeconds}-${AUDIO_HOOK_PACE.maxSeconds}s`,
      });
    }
    if (!GUIDE_PROMPT_PATTERN.test(lastSentence(hook.script))) {
      ctx.addIssue({
        code: 'custom',
        path: ['script'],
        message: 'audio hook must end with a prompt to hire a local walking-tour guide',
      });
    }
  });

export const FieldPhotoCaptureSpecSchema = z
  .object({
    bestTimeOfDay: z.enum(TIMES_OF_DAY),
    localTimeWindow: z.string().regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/, 'use HH:MM-HH:MM'),
    lightingNotes: z.string().min(20),
    angles: z.array(
      z.object({
        angle: z.enum(CAPTURE_ANGLES),
        framingNote: z.string().min(12),
      }),
    ),
    occlusionNotes: z.string().min(20),
    restrictions: z.string().min(10),
  })
  .superRefine((spec, ctx) => {
    const provided = new Set(spec.angles.map((a) => a.angle));
    if (spec.angles.length !== CAPTURE_ANGLES.length || CAPTURE_ANGLES.some((angle) => !provided.has(angle))) {
      ctx.addIssue({
        code: 'custom',
        path: ['angles'],
        message: `exactly one framing note is required for each of: ${CAPTURE_ANGLES.join(', ')}`,
      });
    }
  });
export type FieldPhotoCaptureSpec = z.infer<typeof FieldPhotoCaptureSpecSchema>;

export const SuggestedWalkingTourStopSchema = z.object({
  sequence: z.number().int().min(1),
  dwellMinutes: z.number().int().min(3).max(60),
  talkingPoint: z.string().min(20),
});

export const VerificationSchema = z.object({
  status: z.enum(VERIFICATION_STATUSES),
  notes: z.string().min(10),
});

export const MonumentSchema = z
  .object({
    id: SlugIdSchema,
    names: BilingualNameSchema,
    aliases: z.array(z.string().min(2)),
    subZone: z.string().min(3).optional(),
    monumentType: z.enum(MONUMENT_TYPES),
    tradition: z.enum(RELIGIOUS_TRADITIONS),
    era: EraSchema,
    geo: GeoMetadataSchema,
    visualCues: VisualIdentificationCuesSchema,
    loreChunks: z.array(HierarchicalLoreChunkSchema),
    audioHook: AudioHookSchema,
    nepaliSummary: DevanagariText,
    fieldPhotoSpec: FieldPhotoCaptureSpecSchema,
    walkingTourStop: SuggestedWalkingTourStopSchema,
    verification: VerificationSchema,
  })
  .superRefine((monument, ctx) => {
    const categories = monument.loreChunks.map((c) => c.category);
    const missing = LORE_CATEGORIES.filter((c) => !categories.includes(c));
    if (monument.loreChunks.length !== LORE_CATEGORIES.length || missing.length > 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['loreChunks'],
        message: `monument ${monument.id} needs exactly one chunk per category; missing: ${missing.join(', ') || 'none (duplicates present)'}`,
      });
    }
    if (monument.visualCues.confusableWith.includes(monument.id)) {
      ctx.addIssue({ code: 'custom', path: ['visualCues', 'confusableWith'], message: 'a monument cannot be confusable with itself' });
    }
  });
export type Monument = z.infer<typeof MonumentSchema>;

export const WalkingTourSchema = z.object({
  tourId: SlugIdSchema,
  title: z.string().min(5),
  titleNe: DevanagariText,
  startPoint: z.string().min(5),
  bestStartTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const HeritageZoneSchema = z
  .object({
    zoneId: SlugIdSchema,
    names: BilingualNameSchema,
    designation: z.enum(['UNESCO_MONUMENT_ZONE', 'SATELLITE_HERITAGE_TOWNS']),
    unescoReference: z.string().min(5).nullable(),
    district: z.enum(DISTRICTS),
    centroid: LatLngSchema,
    zoneRadiusM: z.number().int().min(100).max(25000),
    description: z.string().min(80),
    walkingTour: WalkingTourSchema,
    monuments: z.array(MonumentSchema).min(10),
  })
  .superRefine((zone, ctx) => {
    const ids = new Set<string>();
    zone.monuments.forEach((monument, index) => {
      if (ids.has(monument.id)) {
        ctx.addIssue({ code: 'custom', path: ['monuments', index, 'id'], message: `duplicate monument id ${monument.id}` });
      }
      ids.add(monument.id);

      const distance = haversineMeters(zone.centroid, monument.geo);
      if (distance > zone.zoneRadiusM) {
        ctx.addIssue({
          code: 'custom',
          path: ['monuments', index, 'geo'],
          message: `${monument.id} is ${Math.round(distance)}m from the ${zone.zoneId} centroid (zone radius ${zone.zoneRadiusM}m)`,
        });
      }
    });

    const sequences = zone.monuments.map((m) => m.walkingTourStop.sequence).sort((a, b) => a - b);
    if (sequences.some((sequence, index) => sequence !== index + 1)) {
      ctx.addIssue({
        code: 'custom',
        path: ['monuments'],
        message: `walking-tour sequence must run 1..${zone.monuments.length} without gaps; found ${sequences.join(',')}`,
      });
    }
  });
export type HeritageZone = z.infer<typeof HeritageZoneSchema>;

// ============================================
// COMPILED CORPUS TYPES (output of validate_and_compile.ts)
// ============================================

export interface CompiledLoreChunk {
  chunkId: string;
  nodePath: string;
  zoneId: string;
  monumentId: string;
  category: LoreCategory;
  categoryLabel: string;
  title: string;
  text: string;
  wordCount: number;
  language: 'en';
  sourceIds: string[];
  sourceCitations: string[];
  confidence: (typeof CONFIDENCE_LEVELS)[number];
}

export interface CompiledTourStop {
  tourId: string;
  sequence: number;
  dwellMinutes: number;
  talkingPoint: string;
  nextMonumentId: string | null;
  distanceToNextM: number | null;
  legModeToNext: 'walk' | 'drive' | null;
  minutesToNext: number | null;
}

export interface ReferenceEmbedding {
  angle: CaptureAngle;
  vector: number[];
}

export interface CompiledMonument extends Omit<Monument, 'loreChunks' | 'walkingTourStop'> {
  zoneId: string;
  nodePath: string;
  loreChunkIds: string[];
  audioHook: { script: string; estimatedSeconds: number; wordCount: number };
  walkingTourStop: CompiledTourStop;
  referenceEmbeddings: ReferenceEmbedding[];
}

export interface CompiledWalkingTour {
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

export interface CompiledZone extends Omit<HeritageZone, 'monuments' | 'walkingTour'> {
  monumentIds: string[];
  walkingTourId: string;
}

export interface CorpusStats {
  zoneCount: number;
  monumentCount: number;
  loreChunkCount: number;
  totalLoreWords: number;
  meanLoreWordsPerChunk: number;
  audioHookCount: number;
  meanAudioHookSeconds: number;
  requiredFieldPhotos: number;
  monumentsByZone: Record<string, number>;
  monumentsByDynasty: Record<string, number>;
  monumentsByType: Record<string, number>;
  loreConfidence: Record<string, number>;
  coordinatePrecision: Record<string, number>;
  verificationStatus: Record<string, number>;
  wardCoverage: { known: number; unknown: number };
  bilingualNameCoverage: number;
  nepaliSummaryCoverage: number;
  confusablePairs: number;
  sourceUsage: Record<string, number>;
}

export interface CompiledCorpus {
  corpusId: string;
  version: string;
  generatedAt: string;
  attributionPolicy: string;
  embeddingModel: {
    id: string;
    dimensions: number;
    description: string;
  };
  sources: Source[];
  zones: CompiledZone[];
  monuments: CompiledMonument[];
  loreChunks: CompiledLoreChunk[];
  walkingTours: CompiledWalkingTour[];
  stats: CorpusStats;
}
