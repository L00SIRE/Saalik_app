// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 · Integration / Controls — DISCOVERY (Scan & Identify) CONTRACT
//
// The seam for landmark identification. Today it is fulfilled by a curated
// local knowledge base (mock); post-funding the live impl swaps in a vector /
// image-detection backend behind the same interface — Scan UI never changes.
//
// `identifyImage` is the structural hook for the AI roadmap's "image detection
// that redirects to a help page".
// ─────────────────────────────────────────────────────────────────────────────

import type { ImageRef } from './ai';

/** A single identifiable place in the Nepal heritage index. */
export interface Landmark {
  id: string;
  name: string;
  /** Short evocative tagline shown under the name. */
  kicker: string;
  location: string;
  built: string;
  /** Remote image URL for the result card. */
  image: string;
  summary: string;
  facts: string[];
  funFact: string;
  unesco: boolean;
  /** Case-insensitive substrings that resolve to this landmark. */
  keywords: string[];
}

export interface DiscoveryService {
  /** Identify a landmark from free text (name, partial, or filename-like). */
  identify(query: string): Promise<Landmark | null>;
  /** Quick-try suggestion chips. */
  getSuggestions(): Promise<string[]>;

  // ── Roadmap hook (optional until the image model lands) ────────────────────
  /** Identify a landmark from an uploaded/captured image. */
  identifyImage?(image: ImageRef): Promise<Landmark | null>;
}
