import type { CaptureAngle, MonumentRecord, ReferenceEmbedding } from '../types/heritage';

export const VISUAL_EMBEDDING_DIM = 768;
export const LORE_EMBEDDING_DIM = 1536;

export const MAX_ANGLE_WEIGHT = 0.6;
export const TOP3_MEAN_WEIGHT = 0.4;

/** L2-normalize a dense vector. Zero vectors are returned unchanged. */
export function l2Normalize(vector: number[]): number[] {
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector.slice();
  return vector.map((v) => v / norm);
}

/** Cosine similarity between two equal-length dense vectors. */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Embedding dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface PooledSimilarity {
  score: number;
  maxAngleSimilarity: number;
  top3MeanSimilarity: number;
  bestAngle: CaptureAngle | null;
}

/**
 * Angle-weighted pooling across a monument's multi-view reference embeddings:
 * score = 0.6 * max_angle_similarity + 0.4 * top3_mean_similarity
 */
export function angleWeightedSimilarity(
  query: number[],
  embeddings: ReferenceEmbedding[],
): PooledSimilarity {
  if (embeddings.length === 0) {
    return { score: 0, maxAngleSimilarity: 0, top3MeanSimilarity: 0, bestAngle: null };
  }

  const sims = embeddings
    .map((ref) => ({ angle: ref.angle, sim: cosineSimilarity(query, ref.vector) }))
    .sort((x, y) => y.sim - x.sim);

  const max = sims[0]!.sim;
  const top3 = sims.slice(0, 3);
  const top3Mean = top3.reduce((sum, s) => sum + s.sim, 0) / top3.length;

  return {
    score: MAX_ANGLE_WEIGHT * max + TOP3_MEAN_WEIGHT * top3Mean,
    maxAngleSimilarity: max,
    top3MeanSimilarity: top3Mean,
    bestAngle: sims[0]!.angle,
  };
}

export function angleWeightedSimilarityForMonument(
  query: number[],
  monument: MonumentRecord,
): PooledSimilarity {
  return angleWeightedSimilarity(query, monument.referenceEmbeddings);
}

/**
 * Pad or truncate a vector to a target dimensionality for pgvector column alignment.
 * Seed cue-signatures are 128-d; production DINOv2/SigLIP are 768-d.
 */
export function resizeEmbedding(vector: number[], dimensions: number): number[] {
  if (vector.length === dimensions) return vector.slice();
  if (vector.length > dimensions) return vector.slice(0, dimensions);
  const out = vector.slice();
  while (out.length < dimensions) out.push(0);
  return out;
}

/** Deterministic unit test helper: build an orthogonal-ish one-hot-ish cue vector. */
export function unitCueVector(index: number, dimensions: number, magnitude = 1): number[] {
  const v = new Array<number>(dimensions).fill(0);
  const safeIndex = ((index % dimensions) + dimensions) % dimensions;
  v[safeIndex] = magnitude;
  return l2Normalize(v);
}
