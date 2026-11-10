export interface BackoffPolicy {
  baseMs: number;
  maxMs: number;
  jitterRatio: number;
  maxAttempts: number;
}

export const DEFAULT_BACKOFF: BackoffPolicy = {
  baseMs: 15_000,
  maxMs: 30 * 60_000,
  jitterRatio: 0.2,
  maxAttempts: 8,
};

/** Exponential backoff with symmetric jitter: base * 2^(attempt-1), capped at maxMs. */
export function computeBackoffMs(attempt: number, policy: BackoffPolicy = DEFAULT_BACKOFF, random: () => number = Math.random): number {
  const exponent = Math.max(0, attempt - 1);
  const raw = Math.min(policy.maxMs, policy.baseMs * 2 ** exponent);
  const jitter = raw * policy.jitterRatio * (random() * 2 - 1);
  return Math.max(policy.baseMs, Math.round(raw + jitter));
}
