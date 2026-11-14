import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';

export interface ClipEmbedResult {
  vector: number[];
  source: 'clip_worker' | 'deterministic_fallback';
  quality: Record<string, unknown> | null;
  elapsedMs: number | null;
}

const WORKER = process.env.CLIP_WORKER_URL ?? 'http://127.0.0.1:8099';

export async function embedImage(imageBase64: string): Promise<ClipEmbedResult> {
  try {
    const response = await fetch(`${WORKER}/embed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
      signal: AbortSignal.timeout(2500),
    });
    if (response.ok) {
      const body = (await response.json()) as {
        vector?: number[];
        quality?: Record<string, unknown>;
        elapsedMs?: number;
      };
      if (body.vector && body.vector.length > 0) {
        return {
          vector: body.vector,
          source: 'clip_worker',
          quality: body.quality ?? null,
          elapsedMs: body.elapsedMs ?? null,
        };
      }
    }
  } catch {
    // Worker is optional. Field scans still rank against the precomputed index.
  }
  return {
    vector: deterministicVector(imageBase64, 512),
    source: 'deterministic_fallback',
    quality: null,
    elapsedMs: null,
  };
}

export function deterministicVector(seed: string, dim: number): number[] {
  const raw = new Array<number>(dim);
  let state = createHash('sha256').update(seed).digest();
  for (let i = 0; i < dim; i += 1) {
    if (i % state.length === 0 && i > 0) {
      state = createHash('sha256').update(state).digest();
    }
    raw[i] = (state[i % state.length]! / 127.5) - 1;
  }
  const norm = Math.sqrt(raw.reduce((sum, v) => sum + v * v, 0)) || 1;
  return raw.map((v) => v / norm);
}

export interface VisualHit {
  monumentId: string;
  score: number;
}

export function rankVisualIndex(query: number[], topK = 3): VisualHit[] {
  const indexPath = path.resolve(
    __dirname,
    '../../../../frontend/saalik-mobile/src/data/visualIndex.json',
  );
  let parsed: { monuments?: Record<string, Record<string, number[]>> };
  try {
    parsed = JSON.parse(readFileSync(indexPath, 'utf8')) as typeof parsed;
  } catch {
    return [];
  }
  const hits: VisualHit[] = [];
  for (const [monumentId, angles] of Object.entries(parsed.monuments ?? {})) {
    const vectors = Object.values(angles).filter((vector) => vector.length === query.length);
    if (vectors.length === 0) continue;
    const score = Math.max(...vectors.map((vector) => cosine(query, vector)));
    hits.push({ monumentId, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, topK);
}

function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / Math.sqrt(na * nb);
}
