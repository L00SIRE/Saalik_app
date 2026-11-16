import { readFileSync } from "fs";
import path from "path";
import { findRepoRoot } from "./twin/twinData";

export interface BenchmarkSummary {
  photos: number;
  /** Leave-one-photo-out Recall@1 and Recall@3 on the held-out queries (Table (c) of the benchmark report). */
  recallAt1: number;
  recallAt3: number;
  latencyMs: number;
  latencyDevice: string;
}

/** Headline retrieval numbers, read from the vector bundle the last benchmark run exported. */
export function loadBenchmarkSummary(startDir: string = process.cwd()): BenchmarkSummary {
  const bundlePath = path.join(findRepoRoot(startDir), "data", "nepal_heritage_seed", "precomputed_index", "vector_bundle.json");
  const bundle = JSON.parse(readFileSync(bundlePath, "utf8")) as {
    imageCount: number;
    looRecallAt1: number;
    looRecallAt3: number;
    encodeLatencyMsP50: number;
    encodeLatencyDevice: string;
  };
  return {
    photos: bundle.imageCount,
    recallAt1: bundle.looRecallAt1,
    recallAt3: bundle.looRecallAt3,
    latencyMs: bundle.encodeLatencyMsP50,
    latencyDevice: bundle.encodeLatencyDevice,
  };
}
