import { loadHeritageCorpus, selectMonuments } from '../../src/server/services/corpusLoader';
import type { MonumentRecord } from '../../src/server/types/heritage';

let cached: ReturnType<typeof loadHeritageCorpus> | null = null;

export function getCorpus() {
  if (!cached) cached = loadHeritageCorpus();
  return cached;
}

/** Three confusable Kathmandu Durbar temples used for multi-angle disambiguation tests. */
export const CONFUSABLE_KTM_IDS = ['ktm_kasthamandap', 'ktm_trailokya_mohan', 'ktm_maju_dega'] as const;

export function loadConfusableTemples(): MonumentRecord[] {
  return selectMonuments(getCorpus(), [...CONFUSABLE_KTM_IDS]);
}

export function embeddingForAngle(monument: MonumentRecord, angle: string): number[] {
  const hit = monument.referenceEmbeddings.find((e) => e.angle === angle);
  if (!hit) {
    throw new Error(`Missing angle ${angle} on ${monument.id}`);
  }
  return hit.vector.slice();
}

/** Slightly perturb a vector so it is not an exact copy but still nearest to the source. */
export function perturb(vector: number[], noise = 0.02): number[] {
  return vector.map((v, i) => v + (i % 2 === 0 ? noise : -noise) * 0.01);
}
