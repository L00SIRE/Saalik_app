// ─────────────────────────────────────────────────────────────────────────────
// Saalik — Checkpoints / "Places to visit"
//
// A curated set of valley hotspots the traveler can tick off as they go ("we
// went there"). Powers the Places tab: a map-pin list grouped by area, each
// with a visited check toggle that persists across relaunches.
//
// Data is hardcoded demo content (no network). Images are verified Creative
// Commons photos served via Wikimedia's stable Special:FilePath endpoint — see
// IMAGE_CREDITS_PRIVATE.md for attribution. Several checkpoints link to a tour
// that visits them, so a tick can turn into a booking.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type CheckpointCategory =
  | 'Temple'
  | 'Square'
  | 'Stupa'
  | 'Nature'
  | 'Market'
  | 'Craft'
  | 'Viewpoint';

export interface Checkpoint {
  id: string;
  name: string;
  /** Grouping bucket — also the hub filter, e.g. "Tokha", "Bhaktapur". */
  area: string;
  category: CheckpointCategory;
  blurb: string;
  image: string;
  lat: number;
  lng: number;
  /** Optional linked tour that includes this stop. */
  tourId?: string;
  /** UNESCO World Heritage flag — shown as a badge. */
  unesco?: boolean;
}

/** Build a stable Wikimedia Commons image URL (auto-thumbnailed, RN-safe). */
const cc = (file: string, width = 800): string =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/` +
  encodeURIComponent(file).replace(/\(/g, '%28').replace(/\)/g, '%29') +
  `?width=${width}`;

export const CHECKPOINTS: Checkpoint[] = [
  // ─── Kathmandu ──────────────────────────────────────────────────────────────
  {
    id: 'cp-ktm-durbar',
    name: 'Kathmandu Durbar Square',
    area: 'Kathmandu',
    category: 'Square',
    blurb: 'Old royal heart of the city — palaces, pagodas and the Kumari Ghar.',
    image: cc('Basantapurpalace.JPG'),
    lat: 27.7045,
    lng: 85.3072,
    tourId: 'tour-ktm-1',
    unesco: true,
  },
  {
    id: 'cp-ktm-swayambhu',
    name: 'Swayambhunath (Monkey Temple)',
    area: 'Kathmandu',
    category: 'Stupa',
    blurb: '365 steps to a hilltop stupa with the Buddha’s eyes over the valley.',
    image: cc('Swayambhunath 2018.jpg'),
    lat: 27.7149,
    lng: 85.2904,
    tourId: 'tour-ktm-2',
    unesco: true,
  },
  {
    id: 'cp-ktm-boudha',
    name: 'Boudhanath Stupa',
    area: 'Kathmandu',
    category: 'Stupa',
    blurb: 'One of the world’s largest stupas and heart of Tibetan Kathmandu.',
    image: cc('Boudhanath stupa , Kathmandu, Nepal.jpg'),
    lat: 27.7215,
    lng: 85.362,
    unesco: true,
  },
  {
    id: 'cp-ktm-pashupati',
    name: 'Pashupatinath Temple',
    area: 'Kathmandu',
    category: 'Temple',
    blurb: 'Nepal’s holiest Shiva temple on the sacred Bagmati ghats.',
    image: cc('The Pashupatinath Temple 27.jpg'),
    lat: 27.7104,
    lng: 85.3488,
    unesco: true,
  },
  {
    id: 'cp-ktm-asan',
    name: 'Asan Bazaar',
    area: 'Kathmandu',
    category: 'Market',
    blurb: 'A six-way spice-and-everything market crossroads, busy since medieval times.',
    image: cc('Asan Square, Kathmandu (2).jpg'),
    lat: 27.7066,
    lng: 85.3115,
    tourId: 'tour-ktm-1',
  },

  // ─── Tokha ──────────────────────────────────────────────────────────────────
  {
    id: 'cp-tokha-chandeshwori',
    name: 'Chandeshwori Temple, Tokha',
    area: 'Tokha',
    category: 'Temple',
    blurb: 'The old Newar town’s guardian temple and the heart of Tokha Chowk.',
    image: cc('Chandeshwori Temple Tokha Tokha Municipility Kathmandu Nepal Rajesh Dhungana (15).jpg'),
    lat: 27.7847,
    lng: 85.3289,
    tourId: 'tour-tokha-2',
  },
  {
    id: 'cp-tokha-durbar',
    name: 'Tokha Durbar & Bhootkhel',
    area: 'Tokha',
    category: 'Temple',
    blurb: 'The old palace and Shiva shrine on the historic salt-trade trail.',
    image: cc('Shiva Temple Bhootkhel Tokha Kathmandu Nepal Rajesh Dhungana (1).jpg'),
    lat: 27.7861,
    lng: 85.3271,
    tourId: 'tour-tokha-4',
  },
  {
    id: 'cp-tokha-nagi',
    name: 'Nagi Gompa & Shivapuri',
    area: 'Tokha',
    category: 'Nature',
    blurb: 'A forest climb above Tokha to a cliffside nunnery and sunrise ridge.',
    image: cc('Near BaagDwar @ Shivapuri National Park.jpg'),
    lat: 27.8138,
    lng: 85.3683,
    tourId: 'tour-tokha-3',
  },

  // ─── Bhaktapur ──────────────────────────────────────────────────────────────
  {
    id: 'cp-bkt-durbar',
    name: 'Bhaktapur Durbar Square',
    area: 'Bhaktapur',
    category: 'Square',
    blurb: 'The 55-Window Palace, Golden Gate and the best-preserved medieval city.',
    image: cc('View of Bhaktapur Durbar Square.jpg'),
    lat: 27.6722,
    lng: 85.4279,
    tourId: 'tour-bkt-2',
    unesco: true,
  },
  {
    id: 'cp-bkt-nyatapola',
    name: 'Nyatapola Temple',
    area: 'Bhaktapur',
    category: 'Temple',
    blurb: 'Nepal’s tallest temple — five tiers that shrugged off two big quakes.',
    image: cc('Nyatpola & Bhairav Temple.jpg'),
    lat: 27.6717,
    lng: 85.4297,
    tourId: 'tour-bkt-2',
  },
  {
    id: 'cp-bkt-pottery',
    name: 'Pottery Square',
    area: 'Bhaktapur',
    category: 'Craft',
    blurb: 'Rows of clay pots drying in the sun where potters still throw by hand.',
    image: cc('In and around Bhaktapur Pottery Square 07.jpg'),
    lat: 27.6709,
    lng: 85.4275,
    tourId: 'tour-bkt-1',
  },

  // ─── Patan / Lalitpur ─────────────────────────────────────────────────────────
  {
    id: 'cp-ptn-durbar',
    name: 'Patan Durbar Square',
    area: 'Patan',
    category: 'Square',
    blurb: 'A masterpiece of Newar urbanism and the valley’s finest museum.',
    image: cc('Nepal Patan Durbar Square 10 (full res).jpg'),
    lat: 27.6727,
    lng: 85.3255,
    tourId: 'tour-ptn-1',
    unesco: true,
  },
  {
    id: 'cp-ptn-krishna',
    name: 'Krishna Mandir',
    area: 'Patan',
    category: 'Temple',
    blurb: 'A shikhara temple carved entirely from stone, 21 gilded finials and all.',
    image: cc('Krishna Mandir, Patan, Lalitpur.jpg'),
    lat: 27.6735,
    lng: 85.3256,
    tourId: 'tour-ptn-2',
  },
  {
    id: 'cp-ptn-oku',
    name: 'Oku Bahal (Metal Artisans)',
    area: 'Patan',
    category: 'Craft',
    blurb: 'Hidden courtyard where families still cast bronze deities by lost-wax.',
    image: cc('2023 - Patan Museum - Keshav Narayan Chowk & Bidya Mandira - img 0.jpg'),
    lat: 27.6718,
    lng: 85.3243,
    tourId: 'tour-ptn-1',
  },

  // ─── Wider valley ─────────────────────────────────────────────────────────────
  {
    id: 'cp-sankhu',
    name: 'Sankhu Village',
    area: 'Wider Valley',
    category: 'Viewpoint',
    blurb: 'An old trading town on the salt route to Tibet, north-east of the city.',
    image: cc('Sankhu Village.JPG'),
    lat: 27.7456,
    lng: 85.4633,
    tourId: 'tour-tokha-4',
  },
  {
    id: 'cp-changu',
    name: 'Changu Narayan Temple',
    area: 'Wider Valley',
    category: 'Temple',
    blurb: 'Widely held to be the oldest standing temple in the Kathmandu Valley.',
    image: cc('Nepal - Changu Narayan (3566057331).jpg'),
    lat: 27.7163,
    lng: 85.4278,
    unesco: true,
  },
];

/** Distinct areas, in display order. */
export const CHECKPOINT_AREAS: string[] = CHECKPOINTS.reduce<string[]>((acc, cp) => {
  if (!acc.includes(cp.area)) acc.push(cp.area);
  return acc;
}, []);

// ─── Persisted "visited" state (reactive) ─────────────────────────────────────

const STORAGE_KEY = 'saalik_checkpoints_v1';

let visited = new Set<string>();
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
          const ids = JSON.parse(raw) as string[];
          visited = new Set(ids.filter((id) => CHECKPOINTS.some((c) => c.id === id)));
        }
      } catch {
        visited = new Set();
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
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
  } catch {
    // best-effort
  }
}

/**
 * React hook for the Places screen. Returns the visited set (as a plain object
 * map for cheap lookups), a toggle, a clear-all, and progress counts.
 */
export function useCheckpoints() {
  const [, force] = useState(0);

  useEffect(() => {
    let mounted = true;
    const sync = () => {
      if (mounted) force((n) => n + 1);
    };
    listeners.add(sync);
    ensureLoaded().then(sync);
    return () => {
      mounted = false;
      listeners.delete(sync);
    };
  }, []);

  const isVisited = useCallback((id: string) => visited.has(id), []);

  const toggle = useCallback(async (id: string) => {
    if (visited.has(id)) visited.delete(id);
    else visited.add(id);
    visited = new Set(visited);
    emit();
    await persist();
  }, []);

  const clearAll = useCallback(async () => {
    visited = new Set();
    emit();
    await persist();
  }, []);

  return {
    checkpoints: CHECKPOINTS,
    areas: CHECKPOINT_AREAS,
    isVisited,
    toggle,
    clearAll,
    visitedCount: visited.size,
    total: CHECKPOINTS.length,
    loaded,
  };
}
