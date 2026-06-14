// ─────────────────────────────────────────────────────────────────────────────
// Layer 3 · Decision-Making / Logic — Scan & Discover orchestration hook
//
// Owns the scan lifecycle (state + simulated identification timing) and calls
// the Integration layer. The Scan screen consumes this and stays "dumb": it
// renders `status`/`result` and drives the scan-line animation off `status`.
// It has no idea whether identification came from the curated index or a future
// image model.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { services } from '@integration';
import type { Landmark } from '@integration/contracts/discovery';

export type ScanStatus = 'idle' | 'scanning' | 'result' | 'miss';
export type ScanMode = 'text' | 'photo';

/** How long the simulated scan runs before a result resolves. */
export const SCAN_DURATION_MS = 2200;

export interface UseScanner {
  status: ScanStatus;
  result: Landmark | null;
  mode: ScanMode;
  suggestions: string[];
  scan: (query: string, mode?: ScanMode) => void;
  reset: () => void;
}

export function useScanner(): UseScanner {
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [result, setResult] = useState<Landmark | null>(null);
  const [mode, setMode] = useState<ScanMode>('text');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    mounted.current = true;
    services.discovery
      .getSuggestions()
      .then((s) => {
        if (mounted.current) setSuggestions(s);
      })
      .catch(() => {
        /* suggestions are non-critical */
      });
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const scan = useCallback((query: string, scanMode: ScanMode = 'text') => {
    const q = query.trim();
    if (!q) return;

    setMode(scanMode);
    setResult(null);
    setStatus('scanning');

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!mounted.current) return;
      const match = await services.discovery.identify(q);
      if (!mounted.current) return;
      setResult(match);
      setStatus(match ? 'result' : 'miss');
    }, SCAN_DURATION_MS);
  }, []);

  const reset = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setStatus('idle');
    setResult(null);
  }, []);

  return { status, result, mode, suggestions, scan, reset };
}
