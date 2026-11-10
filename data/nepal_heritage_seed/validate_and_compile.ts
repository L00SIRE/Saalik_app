/**
 * Validates the 8 Kathmandu Valley zone seed files against the Zod schema,
 * then compiles the hierarchical RAG corpus and its derived artifacts.
 *
 *   npx ts-node data/nepal_heritage_seed/validate_and_compile.ts [--check]
 *
 * --check validates only and writes nothing.
 */
import fs from 'fs';
import path from 'path';
import type { ZodError } from 'zod';
import {
  AUDIO_HOOK_PACE,
  CAPTURE_ANGLES,
  CAPTURE_ANGLE_LABELS,
  type CaptureAngle,
  type CompiledCorpus,
  type CompiledLoreChunk,
  type CompiledMonument,
  type CompiledWalkingTour,
  type CompiledZone,
  type CorpusStats,
  countWords,
  estimateNarrationSeconds,
  haversineMeters,
  type HeritageZone,
  HeritageZoneSchema,
  LORE_CATEGORY_LABELS,
  type Monument,
  type ReferenceEmbedding,
  type SourceRegistry,
  SourceRegistrySchema,
} from './schema';

const SEED_DIR = __dirname;
const REPO_ROOT = path.resolve(SEED_DIR, '..', '..');

export const ZONE_FILES = [
  'kathmandu_durbar.json',
  'patan_durbar.json',
  'bhaktapur_durbar.json',
  'swayambhunath.json',
  'boudhanath.json',
  'pashupatinath.json',
  'changu_narayan.json',
  'hidden_gems_kirtipur_panauti_bungamati.json',
] as const;

const OUTPUTS = {
  corpus: path.join(SEED_DIR, 'master_rag_corpus.json'),
  shotList: path.join(SEED_DIR, 'field_photography_shot_list.csv'),
  mobileBundle: path.join(REPO_ROOT, 'frontend', 'saalik-mobile', 'src', 'data', 'heritageSeed.json'),
};

const MIN_TOTAL_MONUMENTS = 100;
const CORPUS_VERSION = '2026.11.0';
const EMBEDDING_DIMENSIONS = 128;
const EMBEDDING_MODEL_ID = 'saalik-cue-signature-v1';
// Crowded old-city lanes: ~4.2 km/h, with a detour factor over straight-line distance.
const WALKING_SPEED_M_PER_MIN = 70;
const ROUTE_DETOUR_FACTOR = 1.3;
// Legs longer than this between satellite towns are driven (~25 km/h valley traffic).
const MAX_WALKING_LEG_M = 2500;
const DRIVING_SPEED_M_PER_MIN = 420;

// ============================================
// LOADING & VALIDATION
// ============================================

interface ValidationProblem {
  file: string;
  path: string;
  message: string;
}

function formatZodIssues(file: string, error: ZodError): ValidationProblem[] {
  return error.issues.map((issue) => ({
    file,
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}

function readJson(file: string, problems: ValidationProblem[]): unknown {
  const fullPath = path.join(SEED_DIR, file);
  if (!fs.existsSync(fullPath)) {
    problems.push({ file, path: '(file)', message: 'zone file is missing' });
    return undefined;
  }
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (err) {
    problems.push({ file, path: '(file)', message: `invalid JSON: ${(err as Error).message}` });
    return undefined;
  }
}

function loadSources(problems: ValidationProblem[]): SourceRegistry | undefined {
  const raw = readJson('sources.json', problems);
  if (raw === undefined) return undefined;
  const parsed = SourceRegistrySchema.safeParse(raw);
  if (!parsed.success) {
    problems.push(...formatZodIssues('sources.json', parsed.error));
    return undefined;
  }
  return parsed.data;
}

function loadZones(problems: ValidationProblem[]): HeritageZone[] {
  const zones: HeritageZone[] = [];
  for (const file of ZONE_FILES) {
    const raw = readJson(path.join('zones', file), problems);
    if (raw === undefined) continue;
    const parsed = HeritageZoneSchema.safeParse(raw);
    if (!parsed.success) {
      problems.push(...formatZodIssues(`zones/${file}`, parsed.error));
      continue;
    }
    const expectedId = file.replace(/\.json$/, '');
    if (parsed.data.zoneId !== expectedId) {
      problems.push({ file: `zones/${file}`, path: 'zoneId', message: `zoneId must match file name (${expectedId})` });
    }
    zones.push(parsed.data);
  }
  return zones;
}

function crossValidate(zones: HeritageZone[], sources: SourceRegistry, problems: ValidationProblem[]): void {
  const sourceIds = new Set(sources.sources.map((s) => s.id));
  const monumentZone = new Map<string, string>();
  const tourIds = new Set<string>();

  for (const zone of zones) {
    if (tourIds.has(zone.walkingTour.tourId)) {
      problems.push({ file: `zones/${zone.zoneId}.json`, path: 'walkingTour.tourId', message: `duplicate tour id ${zone.walkingTour.tourId}` });
    }
    tourIds.add(zone.walkingTour.tourId);

    for (const monument of zone.monuments) {
      const existing = monumentZone.get(monument.id);
      if (existing) {
        problems.push({
          file: `zones/${zone.zoneId}.json`,
          path: monument.id,
          message: `monument id also used in ${existing}`,
        });
      }
      monumentZone.set(monument.id, zone.zoneId);
    }
  }

  for (const zone of zones) {
    for (const monument of zone.monuments) {
      const file = `zones/${zone.zoneId}.json`;
      for (const ref of monument.visualCues.confusableWith) {
        if (!monumentZone.has(ref)) {
          problems.push({ file, path: `${monument.id}.visualCues.confusableWith`, message: `unknown monument id ${ref}` });
        }
      }
      monument.loreChunks.forEach((chunk) => {
        for (const sourceId of chunk.sourceIds) {
          if (!sourceIds.has(sourceId)) {
            problems.push({ file, path: `${monument.id}.loreChunks.${chunk.category}`, message: `unknown source id ${sourceId}` });
          }
        }
      });
    }
  }

  const total = zones.reduce((sum, zone) => sum + zone.monuments.length, 0);
  if (zones.length === ZONE_FILES.length && total < MIN_TOTAL_MONUMENTS) {
    problems.push({ file: '(corpus)', path: 'monuments', message: `corpus has ${total} monuments; at least ${MIN_TOTAL_MONUMENTS} required` });
  }
}

// ============================================
// CUE-SIGNATURE REFERENCE EMBEDDINGS
// ============================================
// Deterministic feature-hashed vectors built from each monument's visual
// identification cues, weighted per capture angle. They give the offline demo
// and the API a working multi-angle index before the DINOv2/SigLIP reference
// embeddings from ml_pipeline/ replace them.

type CueGroup = 'form' | 'tiers' | 'material' | 'vahana' | 'iconography' | 'feature' | 'context' | 'identity';

const ANGLE_GROUP_WEIGHTS: Record<CaptureAngle, Record<CueGroup, number>> = {
  ESTABLISHING_FRONT: { form: 1.0, tiers: 1.0, material: 0.8, vahana: 0.6, iconography: 0.3, feature: 0.7, context: 0.25, identity: 0.9 },
  LEFT_45: { form: 0.9, tiers: 1.0, material: 0.8, vahana: 0.5, iconography: 0.25, feature: 0.6, context: 0.35, identity: 0.85 },
  RIGHT_45: { form: 0.9, tiers: 1.0, material: 0.8, vahana: 0.5, iconography: 0.25, feature: 0.6, context: 0.35, identity: 0.85 },
  CLOSE_UP_ICONOGRAPHY: { form: 0.2, tiers: 0.1, material: 0.7, vahana: 0.9, iconography: 1.0, feature: 0.5, context: 0.05, identity: 0.9 },
  WIDE_COURTYARD_CONTEXT: { form: 0.7, tiers: 0.6, material: 0.4, vahana: 0.2, iconography: 0.1, feature: 0.35, context: 1.0, identity: 0.7 },
};

const STOP_WORDS = new Set([
  'the', 'and', 'with', 'for', 'from', 'that', 'this', 'its', 'are', 'was', 'has', 'have', 'into', 'onto', 'over', 'under',
  'each', 'one', 'two', 'three', 'four', 'five', 'six', 'side', 'sides', 'front', 'back', 'top', 'base', 'small', 'large',
  'set', 'pair', 'pairs', 'near', 'also', 'only', 'which', 'their', 'they', 'not', 'other', 'than', 'more', 'most',
]);

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u = Math.max(rand(), 1e-12);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function cueTokens(monument: Monument, zoneId: string): Record<CueGroup, string[]> {
  const cues = monument.visualCues;
  return {
    form: [`type:${monument.monumentType}`, `tradition:${monument.tradition}`],
    tiers: [`tiers:${cues.roofTiers}`],
    material: cues.primaryMaterials.map((m) => `material:${m}`),
    vahana: cues.guardianVahanas.flatMap(tokenize),
    iconography: cues.deityMudrasWeapons.flatMap(tokenize),
    feature: cues.distinguishingFeatures.flatMap(tokenize),
    context: [`zone:${zoneId}`, ...(monument.subZone ? [`subzone:${monument.subZone.toLowerCase()}`] : [])],
    identity: [0, 1, 2, 3].map((i) => `identity:${monument.id}:${i}`),
  };
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function buildCueSignatureEmbeddings(monument: Monument, zoneId: string): ReferenceEmbedding[] {
  const groups = cueTokens(monument, zoneId);
  return CAPTURE_ANGLES.map((angle) => {
    const vector = new Array<number>(EMBEDDING_DIMENSIONS).fill(0);
    const weights = ANGLE_GROUP_WEIGHTS[angle];
    (Object.keys(groups) as CueGroup[]).forEach((group) => {
      const groupTokens = groups[group];
      if (groupTokens.length === 0) return;
      const perToken = weights[group] / Math.sqrt(groupTokens.length);
      for (const token of groupTokens) {
        for (const salt of ['a', 'b']) {
          const hash = fnv1a(`${salt}|${token}`);
          const index = hash % EMBEDDING_DIMENSIONS;
          const sign = (hash >>> 16) & 1 ? 1 : -1;
          vector[index] = (vector[index] ?? 0) + sign * perToken;
        }
      }
    });

    const rand = mulberry32(fnv1a(`${monument.id}|${angle}`));
    const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1;
    const noiseScale = (0.08 * norm) / Math.sqrt(EMBEDDING_DIMENSIONS);
    const noisy = vector.map((v) => v + gaussian(rand) * noiseScale);
    const noisyNorm = Math.sqrt(noisy.reduce((sum, v) => sum + v * v, 0)) || 1;
    return { angle, vector: noisy.map((v) => round(v / noisyNorm, 4)) };
  });
}

// ============================================
// COMPILATION
// ============================================

function tally<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, item) => {
    const k = key(item);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function compile(zones: HeritageZone[], sources: SourceRegistry): CompiledCorpus {
  const citationById = new Map(sources.sources.map((s) => [s.id, s.citation]));
  const compiledZones: CompiledZone[] = [];
  const compiledMonuments: CompiledMonument[] = [];
  const compiledChunks: CompiledLoreChunk[] = [];
  const walkingTours: CompiledWalkingTour[] = [];

  for (const zone of zones) {
    const ordered = [...zone.monuments].sort((a, b) => a.walkingTourStop.sequence - b.walkingTourStop.sequence);
    let totalDistance = 0;
    let totalMinutes = 0;

    ordered.forEach((monument, index) => {
      const nodePath = `kathmandu_valley/${zone.zoneId}/${monument.id}`;
      const next = ordered[index + 1];
      const distanceToNext = next ? Math.round(haversineMeters(monument.geo, next.geo) * ROUTE_DETOUR_FACTOR) : null;
      const legMode = distanceToNext === null ? null : distanceToNext > MAX_WALKING_LEG_M ? 'drive' : 'walk';
      const legMinutes =
        distanceToNext === null
          ? null
          : Math.max(1, Math.round(distanceToNext / (legMode === 'drive' ? DRIVING_SPEED_M_PER_MIN : WALKING_SPEED_M_PER_MIN)));
      totalDistance += distanceToNext ?? 0;
      totalMinutes += monument.walkingTourStop.dwellMinutes + (legMinutes ?? 0);

      const chunkIds = monument.loreChunks.map((chunk) => {
        const chunkId = `${monument.id}__${chunk.category.toLowerCase()}`;
        compiledChunks.push({
          chunkId,
          nodePath: `${nodePath}/${chunk.category.toLowerCase()}`,
          zoneId: zone.zoneId,
          monumentId: monument.id,
          category: chunk.category,
          categoryLabel: LORE_CATEGORY_LABELS[chunk.category],
          title: chunk.title,
          text: chunk.text,
          wordCount: countWords(chunk.text),
          language: 'en',
          sourceIds: chunk.sourceIds,
          sourceCitations: chunk.sourceIds.map((id) => citationById.get(id) ?? id),
          confidence: chunk.confidence,
        });
        return chunkId;
      });

      const { loreChunks: _lore, walkingTourStop, audioHook, ...rest } = monument;
      compiledMonuments.push({
        ...rest,
        zoneId: zone.zoneId,
        nodePath,
        loreChunkIds: chunkIds,
        audioHook: {
          script: audioHook.script,
          estimatedSeconds: estimateNarrationSeconds(audioHook.script),
          wordCount: countWords(audioHook.script),
        },
        walkingTourStop: {
          tourId: zone.walkingTour.tourId,
          sequence: walkingTourStop.sequence,
          dwellMinutes: walkingTourStop.dwellMinutes,
          talkingPoint: walkingTourStop.talkingPoint,
          nextMonumentId: next?.id ?? null,
          distanceToNextM: distanceToNext,
          legModeToNext: legMode,
          minutesToNext: legMinutes,
        },
        referenceEmbeddings: buildCueSignatureEmbeddings(monument, zone.zoneId),
      });
    });

    walkingTours.push({
      ...zone.walkingTour,
      zoneId: zone.zoneId,
      stopMonumentIds: ordered.map((m) => m.id),
      totalDistanceM: totalDistance,
      totalDurationMinutes: totalMinutes,
    });

    const { monuments: _monuments, walkingTour, ...zoneRest } = zone;
    compiledZones.push({
      ...zoneRest,
      monumentIds: ordered.map((m) => m.id),
      walkingTourId: walkingTour.tourId,
    });
  }

  const totalLoreWords = compiledChunks.reduce((sum, c) => sum + c.wordCount, 0);
  const hookSeconds = compiledMonuments.map((m) => m.audioHook.estimatedSeconds);
  const confusablePairs = new Set<string>();
  compiledMonuments.forEach((m) =>
    m.visualCues.confusableWith.forEach((other) => confusablePairs.add([m.id, other].sort().join('|'))),
  );

  const stats: CorpusStats = {
    zoneCount: compiledZones.length,
    monumentCount: compiledMonuments.length,
    loreChunkCount: compiledChunks.length,
    totalLoreWords,
    meanLoreWordsPerChunk: Math.round(totalLoreWords / Math.max(1, compiledChunks.length)),
    audioHookCount: compiledMonuments.length,
    meanAudioHookSeconds: Math.round(hookSeconds.reduce((a, b) => a + b, 0) / Math.max(1, hookSeconds.length)),
    requiredFieldPhotos: compiledMonuments.length * CAPTURE_ANGLES.length,
    monumentsByZone: tally(compiledMonuments, (m) => m.zoneId),
    monumentsByDynasty: tally(compiledMonuments, (m) => m.era.dynasty),
    monumentsByType: tally(compiledMonuments, (m) => m.monumentType),
    loreConfidence: tally(compiledChunks, (c) => c.confidence),
    coordinatePrecision: tally(compiledMonuments, (m) => m.geo.coordinatePrecision),
    verificationStatus: tally(compiledMonuments, (m) => m.verification.status),
    wardCoverage: {
      known: compiledMonuments.filter((m) => m.geo.ward !== null).length,
      unknown: compiledMonuments.filter((m) => m.geo.ward === null).length,
    },
    bilingualNameCoverage: compiledMonuments.filter((m) => m.names.en && m.names.ne && m.names.romanized).length,
    nepaliSummaryCoverage: compiledMonuments.filter((m) => m.nepaliSummary.length > 0).length,
    confusablePairs: confusablePairs.size,
    sourceUsage: tally(
      compiledChunks.flatMap((c) => c.sourceIds),
      (id) => id,
    ),
  };

  return {
    corpusId: 'saalik_kathmandu_valley_heritage',
    version: CORPUS_VERSION,
    generatedAt: new Date().toISOString(),
    attributionPolicy: sources.attributionPolicy,
    embeddingModel: {
      id: EMBEDDING_MODEL_ID,
      dimensions: EMBEDDING_DIMENSIONS,
      description:
        'Deterministic feature-hashed signatures of each monument\'s visual identification cues, weighted per capture angle. Interim index for offline demo and API tests; replace with DINOv2/SigLIP reference embeddings produced by ml_pipeline/.',
    },
    sources: sources.sources,
    zones: compiledZones,
    monuments: compiledMonuments,
    loreChunks: compiledChunks,
    walkingTours,
    stats,
  };
}

// ============================================
// ARTIFACT WRITERS
// ============================================

function csvCell(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildShotList(corpus: CompiledCorpus): string {
  const header = [
    'zone_id', 'monument_id', 'name_en', 'name_ne', 'angle', 'angle_label', 'framing_note', 'best_time_of_day',
    'local_time_window', 'lat', 'lng', 'geofence_radius_m', 'occlusion_notes', 'restrictions',
  ];
  const rows = corpus.monuments.flatMap((m) =>
    m.fieldPhotoSpec.angles.map((a) =>
      [
        m.zoneId, m.id, m.names.en, m.names.ne, a.angle, CAPTURE_ANGLE_LABELS[a.angle], a.framingNote,
        m.fieldPhotoSpec.bestTimeOfDay, m.fieldPhotoSpec.localTimeWindow, m.geo.lat, m.geo.lng, m.geo.geofenceRadiusM,
        m.fieldPhotoSpec.occlusionNotes, m.fieldPhotoSpec.restrictions,
      ].map(csvCell).join(','),
    ),
  );
  return [header.join(','), ...rows].join('\n') + '\n';
}

function buildMobileBundle(corpus: CompiledCorpus) {
  const chunksByMonument = new Map<string, CompiledLoreChunk[]>();
  corpus.loreChunks.forEach((chunk) => {
    const list = chunksByMonument.get(chunk.monumentId) ?? [];
    list.push(chunk);
    chunksByMonument.set(chunk.monumentId, list);
  });

  return {
    corpusId: corpus.corpusId,
    version: corpus.version,
    generatedAt: corpus.generatedAt,
    embeddingModel: corpus.embeddingModel,
    sources: corpus.sources.map(({ id, citation }) => ({ id, citation })),
    zones: corpus.zones.map((z) => ({
      zoneId: z.zoneId,
      names: z.names,
      designation: z.designation,
      centroid: z.centroid,
      monumentIds: z.monumentIds,
      walkingTourId: z.walkingTourId,
    })),
    walkingTours: corpus.walkingTours,
    monuments: corpus.monuments.map((m) => ({
      id: m.id,
      zoneId: m.zoneId,
      subZone: m.subZone ?? null,
      names: m.names,
      monumentType: m.monumentType,
      tradition: m.tradition,
      era: { dynasty: m.era.dynasty, century: m.era.century, foundingYearCE: m.era.foundingYearCE },
      geo: { lat: m.geo.lat, lng: m.geo.lng, elevationM: m.geo.elevationM, geofenceRadiusM: m.geo.geofenceRadiusM },
      visualCues: {
        roofTiers: m.visualCues.roofTiers,
        primaryMaterials: m.visualCues.primaryMaterials,
        distinguishingFeatures: m.visualCues.distinguishingFeatures,
        confusableWith: m.visualCues.confusableWith,
        disambiguationTip: m.visualCues.disambiguationTip,
      },
      audioHook: m.audioHook,
      nepaliSummary: m.nepaliSummary,
      fieldPhotoSpec: m.fieldPhotoSpec,
      walkingTourStop: m.walkingTourStop,
      verificationStatus: m.verification.status,
      loreChunks: (chunksByMonument.get(m.id) ?? []).map((c) => ({
        chunkId: c.chunkId,
        category: c.category,
        categoryLabel: c.categoryLabel,
        title: c.title,
        text: c.text,
        sourceIds: c.sourceIds,
        confidence: c.confidence,
      })),
      referenceEmbeddings: m.referenceEmbeddings,
    })),
  };
}

// Pretty-prints JSON but keeps numeric arrays (embedding vectors) on one line.
function stringifyCorpus(value: unknown): string {
  return JSON.stringify(value, null, 2).replace(/\[\s*(-?\d[\d.e+-]*(?:,\s*-?\d[\d.e+-]*)*)\s*\]/g, (_m, nums: string) =>
    `[${nums.split(/,\s*/).join(', ')}]`,
  );
}

function writeFile(target: string, contents: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, contents);
  console.log(`  wrote ${path.relative(REPO_ROOT, target)} (${(Buffer.byteLength(contents) / 1024).toFixed(1)} KB)`);
}

function printStats(stats: CorpusStats): void {
  const line = (label: string, value: string | number) => console.log(`  ${label.padEnd(32)} ${value}`);
  console.log('\nCoverage statistics');
  line('Zones', stats.zoneCount);
  line('Monuments', stats.monumentCount);
  line('Lore chunks', `${stats.loreChunkCount} (${stats.totalLoreWords} words, mean ${stats.meanLoreWordsPerChunk}/chunk)`);
  line('Audio hooks', `${stats.audioHookCount} (mean ~${stats.meanAudioHookSeconds}s at ${AUDIO_HOOK_PACE.wordsPerMinute} wpm)`);
  line('Required field photos', stats.requiredFieldPhotos);
  line('Bilingual names', `${stats.bilingualNameCoverage}/${stats.monumentCount}`);
  line('Nepali summaries', `${stats.nepaliSummaryCoverage}/${stats.monumentCount}`);
  line('Ward recorded', `${stats.wardCoverage.known}/${stats.monumentCount}`);
  line('Confusable pairs', stats.confusablePairs);
  line('By zone', JSON.stringify(stats.monumentsByZone));
  line('By dynasty', JSON.stringify(stats.monumentsByDynasty));
  line('Lore confidence', JSON.stringify(stats.loreConfidence));
  line('Coordinate precision', JSON.stringify(stats.coordinatePrecision));
  line('Verification status', JSON.stringify(stats.verificationStatus));
}

// ============================================
// ENTRY POINT
// ============================================

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const problems: ValidationProblem[] = [];

  const sources = loadSources(problems);
  const zones = loadZones(problems);
  if (sources) crossValidate(zones, sources, problems);

  if (problems.length > 0 || !sources) {
    console.error(`\nValidation failed with ${problems.length} problem(s):`);
    problems.forEach((p) => console.error(`  [${p.file}] ${p.path}: ${p.message}`));
    process.exit(1);
  }

  console.log(`Validated ${zones.length} zone files and ${sources.sources.length} sources.`);
  const corpus = compile(zones, sources);

  if (!checkOnly) {
    writeFile(OUTPUTS.corpus, stringifyCorpus(corpus) + '\n');
    writeFile(OUTPUTS.shotList, buildShotList(corpus));
    writeFile(OUTPUTS.mobileBundle, JSON.stringify(buildMobileBundle(corpus)) + '\n');
  }
  printStats(corpus.stats);
}

if (require.main === module) {
  main();
}
