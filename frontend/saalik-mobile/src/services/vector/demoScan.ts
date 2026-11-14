import type { CaptureAngle, GeoFix, HeritageMonument, ScanResult } from '../../types/heritage';
import visualIndex from '../../data/visualIndex.json';
import { l2Normalize, rankMonuments } from './similarity';

const INDEXED = (visualIndex as { dim: number; monuments: Record<string, Record<string, number[]>> }).monuments;

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
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

export interface DemoScanOptions {
  angle: CaptureAngle;
  /** Simulated field noise (occlusion, lighting) as a fraction of the vector norm. */
  noise?: number;
  /** Portion of a confusable neighbour mixed into the query, to exercise disambiguation. */
  confuserMix?: number;
  seed?: number;
  /** Real device GPS; when absent or far from the target, the target's own location is simulated. */
  deviceFix?: GeoFix | null;
}

/**
 * NTB VIP Demo Mode scan. Without an on-device vision model, the query vector is
 * the target's reference embedding perturbed by realistic noise, then ranked
 * against the full bundled index exactly as the cloud service would.
 */
export function simulateDemoScan(
  target: HeritageMonument,
  allMonuments: HeritageMonument[],
  options: DemoScanOptions,
): ScanResult {
  const rand = mulberry32(options.seed ?? Date.now());
  const indexedAngles = INDEXED[target.id];
  const pool = indexedAngles
    ? allMonuments
        .filter((monument) => INDEXED[monument.id])
        .map((monument) => ({
          ...monument,
          referenceEmbeddings: Object.entries(INDEXED[monument.id] ?? {}).map(([angle, vector]) => ({
            angle: angle as CaptureAngle,
            vector,
          })),
        }))
    : allMonuments;
  const indexedTarget = pool.find((monument) => monument.id === target.id) ?? target;
  const reference =
    indexedTarget.referenceEmbeddings.find((r) => r.angle === options.angle) ??
    indexedTarget.referenceEmbeddings[0];
  if (!reference) {
    return { source: 'on_device_demo', searchRadiusM: null, matches: [], notice: 'This monument has no reference embeddings yet.' };
  }

  const noise = options.noise ?? 0.18;
  const confuserMix = options.confuserMix ?? 0.15;
  const confuser = pool.find((m) => target.visualCues.confusableWith.includes(m.id));
  const confuserVector = confuser?.referenceEmbeddings.find((r) => r.angle === options.angle)?.vector;
  const scale = noise / Math.sqrt(reference.vector.length);

  const query = l2Normalize(
    reference.vector.map((v, i) => v + (confuserVector ? confuserMix * (confuserVector[i] ?? 0) : 0) + gaussian(rand) * scale),
  );

  const simulatedFix: GeoFix = {
    lat: target.geo.lat + gaussian(rand) * 0.00012,
    lng: target.geo.lng + gaussian(rand) * 0.00012,
    accuracyM: 12,
  };
  const deviceIsNear =
    options.deviceFix &&
    Math.abs(options.deviceFix.lat - target.geo.lat) < 0.01 &&
    Math.abs(options.deviceFix.lng - target.geo.lng) < 0.01;
  const fix = deviceIsNear ? options.deviceFix! : simulatedFix;

  const { matches, radiusM } = rankMonuments(query, pool, fix);
  return {
    source: 'on_device_demo',
    searchRadiusM: radiusM,
    matches,
    notice: indexedAngles
      ? 'Demo mode: cosine match against the precomputed CLIP index of open-license reference photos.'
      : 'Demo mode: matched on-device against bundled cue-signature reference embeddings.',
  };
}
