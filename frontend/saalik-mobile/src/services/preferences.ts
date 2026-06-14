// ─────────────────────────────────────────────────────────────────────────────
// Saalik — App preferences store
//
// A tiny reactive, AsyncStorage-backed settings store. This is what makes the
// Settings screen real (no "coming soon"): every toggle/picker here persists
// across relaunches and broadcasts to any mounted `usePreferences()` consumer.
//
// Deliberately framework-light — a module-level cache + a Set of listeners —
// so it has zero dependencies beyond AsyncStorage and React. Whoever "owns"
// this app can add a field to AppPreferences + DEFAULT_PREFERENCES and it shows
// up everywhere automatically.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type CurrencyCode = 'USD' | 'NPR' | 'EUR' | 'GBP' | 'AUD';
export type DistanceUnit = 'km' | 'mi';
export type LanguageCode = 'en' | 'ne' | 'hi';

export interface AppPreferences {
  /** Master switch for push notifications. */
  pushNotifications: boolean;
  /** Remind me before an upcoming tour. */
  bookingReminders: boolean;
  /** Nudge me to tip after a completed tour. */
  tipReminders: boolean;
  /** Product news + new-tour emails. */
  emailUpdates: boolean;
  /** Display currency for prices/tips. */
  currency: CurrencyCode;
  /** Distance unit shown on tour cards. */
  distanceUnit: DistanceUnit;
  /** Interface language (display only in the demo). */
  language: LanguageCode;
  /** Respect reduced-motion / fewer animations. */
  reduceMotion: boolean;
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  pushNotifications: true,
  bookingReminders: true,
  tipReminders: true,
  emailUpdates: false,
  currency: 'USD',
  distanceUnit: 'km',
  language: 'en',
  reduceMotion: false,
};

// ─── Option metadata (drives the pickers in the Settings screen) ─────────────

export const CURRENCY_OPTIONS: { value: CurrencyCode; label: string; symbol: string }[] = [
  { value: 'USD', label: 'US Dollar', symbol: '$' },
  { value: 'NPR', label: 'Nepali Rupee', symbol: 'Rs' },
  { value: 'EUR', label: 'Euro', symbol: '€' },
  { value: 'GBP', label: 'British Pound', symbol: '£' },
  { value: 'AUD', label: 'Australian Dollar', symbol: 'A$' },
];

export const LANGUAGE_OPTIONS: { value: LanguageCode; label: string; native: string }[] = [
  { value: 'en', label: 'English', native: 'English' },
  { value: 'ne', label: 'Nepali', native: 'नेपाली' },
  { value: 'hi', label: 'Hindi', native: 'हिन्दी' },
];

export const DISTANCE_OPTIONS: { value: DistanceUnit; label: string }[] = [
  { value: 'km', label: 'Kilometres' },
  { value: 'mi', label: 'Miles' },
];

// ─── Store internals ─────────────────────────────────────────────────────────

const STORAGE_KEY = 'saalik_prefs_v1';

let cache: AppPreferences = { ...DEFAULT_PREFERENCES };
let loaded = false;
let loadPromise: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppPreferences>;
          // Merge over defaults so new fields added later are backfilled.
          cache = { ...DEFAULT_PREFERENCES, ...parsed };
        }
      } catch {
        // Corrupt value — fall back to defaults silently.
        cache = { ...DEFAULT_PREFERENCES };
      } finally {
        loaded = true;
        emit();
      }
    })();
  }
  return loadPromise;
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
  } catch {
    // Best-effort — the in-memory cache is still authoritative this session.
  }
}

/** Imperative read (non-reactive) — handy outside React. */
export function getPreferences(): AppPreferences {
  return { ...cache };
}

/**
 * React hook: returns the current preferences plus `update`/`reset` helpers.
 * Re-renders every consumer whenever any field changes.
 */
export function usePreferences() {
  const [prefs, setPrefs] = useState<AppPreferences>(cache);

  useEffect(() => {
    let mounted = true;
    const sync = () => {
      if (mounted) setPrefs({ ...cache });
    };
    listeners.add(sync);
    ensureLoaded().then(sync);
    return () => {
      mounted = false;
      listeners.delete(sync);
    };
  }, []);

  const update = useCallback(async (patch: Partial<AppPreferences>) => {
    cache = { ...cache, ...patch };
    emit();
    await persist();
  }, []);

  const reset = useCallback(async () => {
    cache = { ...DEFAULT_PREFERENCES };
    emit();
    await persist();
  }, []);

  return { prefs, update, reset, loaded };
}
