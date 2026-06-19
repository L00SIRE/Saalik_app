/**
 * Local demo images bundled from `assets/images/`.
 *
 * Drop JPEGs into `frontend/saalik-mobile/assets/images/` using the exact
 * filenames referenced in the `require()` calls below. Components call the
 * helpers here first; if no local asset exists for that tour/landmark/hub,
 * they fall back to the remote URL in demoSeed / landmarks.
 */
import type { ImageSourcePropType } from 'react-native';

// ─── Bundled files (exact filenames from your upload list) ───────────────────

const files = {
  bhaktapur_pottery: require('../../assets/images/bhaktapur_pottery.jpg'),
  bhaktapur: require('../../assets/images/bhaktapur.jpg'),
  bouddhanath: require('../../assets/images/bouddhanath.jpg'),
  hidden_patan: require('../../assets/images/Hidden_Patan.jpg'),
  jujudhau: require('../../assets/images/jujudhau.jpg'),
  kathmandu_durbar_kumari: require('../../assets/images/Kathmandu_durbar_sq_kumari.jpg'),
  kathmandu: require('../../assets/images/kathmandu.jpg'),
  krishna_mandir: require('../../assets/images/Krishna_mandir.jpg'),
  lumbini: require('../../assets/images/lumbini.jpg'),
  nyatapola_dawn: require('../../assets/images/nyatapola_dawn.jpg'),
  pashupati: require('../../assets/images/pashupati.jpg'),
  patan_slow_walk: require('../../assets/images/patan_slow_walk.jpg'),
  patan: require('../../assets/images/patan.jpg'),
  phewa_lake: require('../../assets/images/phewa_lake.jpg'),
  pokhara: require('../../assets/images/pokhara.jpg'),
  shivapuri: require('../../assets/images/shivapuri.jpg'),
  swayambhu_sunrise: require('../../assets/images/swayambhu_sunrise.jpg'),
  swayambhunath: require('../../assets/images/swayambhunath.jpg'),
  tokha_after_dark: require('../../assets/images/tokha_after_dark.jpg'),
  tokha_chaku_trail: require('../../assets/images/tokha_chaku_trail.jpg'),
  tokha_old_town: require('../../assets/images/tokha_old_town.jpg'),
  tokha: require('../../assets/images/tokha.jpg'),
} as const;

// ─── Tour cover + gallery (tour id → local asset) ────────────────────────────

const TOUR_GALLERY: Record<string, ImageSourcePropType[]> = {
  'tour-bishnu-1': [files.hidden_patan],
  'tour-bishnu-3': [files.patan_slow_walk],
  'tour-tokha-1': [files.tokha_chaku_trail],
  'tour-tokha-2': [files.tokha_old_town],
  'tour-tokha-3': [files.shivapuri],
  'tour-tokha-5': [files.tokha_after_dark],
  'tour-bkt-1': [files.bhaktapur_pottery],
  'tour-bkt-2': [files.nyatapola_dawn],
  'tour-bkt-3': [files.jujudhau],
  'tour-ptn-2': [files.krishna_mandir],
  'tour-ktm-1': [files.kathmandu_durbar_kumari],
  'tour-ktm-2': [files.swayambhu_sunrise],
};

// ─── Scan & Discover landmarks (landmark id → local asset) ───────────────────

const LANDMARK_IMAGES: Record<string, ImageSourcePropType> = {
  pashupatinath: files.pashupati,
  boudhanath: files.bouddhanath,
  swayambhunath: files.swayambhunath,
  'kathmandu-durbar': files.kathmandu_durbar_kumari,
  bhaktapur: files.bhaktapur,
  patan: files.patan,
  lumbini: files.lumbini,
  phewa: files.phewa_lake,
};

// ─── Explore hub city cards (hub name → local asset) ─────────────────────────

const HUB_IMAGES: Record<string, ImageSourcePropType> = {
  Kathmandu: files.kathmandu,
  Tokha: files.tokha,
  Pokhara: files.pokhara,
  Bhaktapur: files.bhaktapur,
  Patan: files.patan,
};

// ─── Public helpers ──────────────────────────────────────────────────────────

/** Cover photo for a tour card / booking thumbnail. */
export function tourCoverSource(tour: {
  id: string;
  photos?: string[];
}): ImageSourcePropType | undefined {
  const local = TOUR_GALLERY[tour.id]?.[0];
  if (local) return local;
  const uri = tour.photos?.[0];
  return uri ? { uri } : undefined;
}

/** All photos for tour detail carousel + gallery. */
export function tourGallerySources(tour: {
  id: string;
  photos?: string[];
}): ImageSourcePropType[] {
  const local = TOUR_GALLERY[tour.id];
  if (local?.length) return local;
  return (tour.photos ?? []).filter(Boolean).map((uri) => ({ uri }));
}

/** Scan & Discover result hero. */
export function landmarkImageSource(
  landmarkId: string,
  fallbackUri?: string,
): ImageSourcePropType | undefined {
  const local = LANDMARK_IMAGES[landmarkId];
  if (local) return local;
  return fallbackUri ? { uri: fallbackUri } : undefined;
}

/** Explore tab city hub card. */
export function hubImageSource(
  hubName: string,
  fallbackUri?: string,
): ImageSourcePropType | undefined {
  const local = HUB_IMAGES[hubName];
  if (local) return local;
  return fallbackUri ? { uri: fallbackUri } : undefined;
}

/** Stable string key for gallery tile dedup (local tours share one bundled asset). */
export function tourPhotoKey(tourId: string, index = 0): string {
  return TOUR_GALLERY[tourId] ? `local:${tourId}:${index}` : '';
}
