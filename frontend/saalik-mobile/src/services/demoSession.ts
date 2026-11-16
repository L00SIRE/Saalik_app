// ─────────────────────────────────────────────────────────────────────────────
// Saalik — Demo Session manager
//
// Owns the lifecycle of a demo run: who's signed in, what state they've
// accumulated, and how to clean up. Persists to AsyncStorage so a reviewer
// (App Store review, investor, or curious user) can kill+relaunch the app
// without losing the session — this is non-obvious but matters because Apple
// reviewers regularly background the app mid-flow.
//
// Routing strategy: api.ts checks `demoSession.isActive()` at the top of every
// data-fetching function. If active, it returns a deep clone of the in-memory
// store rather than hitting the network. We never mix demo data into the real
// network layer — clean separation.
// ─────────────────────────────────────────────────────────────────────────────

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthUser } from '@app-types/auth';
import type { Booking, Guide, Review, Tour } from '@app-types/api';
import {
  ALL_REVIEWS,
  BISHNU_REVIEWS,
  BISHNU_TOURS,
  CATALOG_TOURS,
  DEMO_GUIDES,
  FEATURED_TOURS,
  GUIDE_EARNINGS,
  GUIDE_INCOMING_BOOKINGS,
  GUIDE_PROFILE,
  GUIDE_USER,
  TRAVELER_BOOKINGS,
  TRAVELER_REVIEWS,
  TRAVELER_USER,
  TRAVELER_WISHLIST,
  type DemoPersona,
  type GuideEarnings,
} from './demoSeed';

const STORAGE_KEY = 'saalik_demo_session_v1';
const HANDOFF_KEY = 'saalik_demo_handoff_v1';

// ─── Persistent store shape ──────────────────────────────────────────────────

interface DemoStore {
  persona: DemoPersona;
  startedAt: string;
  /** Mutable across the session (booking/cancel/review). */
  travelerBookings: Booking[];
  /** Mutable for the guide persona — incoming bookings list. */
  guideIncoming: Booking[];
  /** Mutable earnings — accept bumps 7d/30d/all-time + today's sparkline. */
  guideEarnings: GuideEarnings;
  /** Reviews authored by the active persona during this session. */
  authoredReviews: Review[];
  /** Tour IDs the traveler has saved/wishlisted. */
  wishlist: string[];
  /** Counter for analytics on conversion nudges (used by signup nudge logic). */
  nudgeImpressions: Record<string, number>;
}

/** Expected tip "tour price" shown on Bishnu's earnings card (tours themselves are free). */
export function demoTourPriceUsd(booking: Booking): number {
  return Math.max(15, booking.partySize * 15);
}

let store: DemoStore | null = null;
let bootstrapPromise: Promise<DemoStore | null> | null = null;

// ─── Synthetic auth tokens ───────────────────────────────────────────────────
// We use the real tokenManager so AuthContext bootstrap "just works" — the
// only thing different is the token value itself. Demo tokens never touch
// the network because api.ts short-circuits before the axios call.

export function demoTokensFor(persona: DemoPersona): {
  accessToken: string;
  refreshToken: string;
} {
  return {
    accessToken: `demo-access-${persona}`,
    refreshToken: `demo-refresh-${persona}`,
  };
}

export function isDemoToken(token: string | null): boolean {
  return !!token && token.startsWith('demo-access-');
}

export function personaFromToken(token: string | null): DemoPersona | null {
  if (!isDemoToken(token)) return null;
  const persona = token!.replace('demo-access-', '');
  if (persona === 'traveler-aanya' || persona === 'guide-bishnu') return persona;
  return null;
}

// ─── Store bootstrap & lifecycle ─────────────────────────────────────────────

/**
 * Bookings Aanya made from a scanned monument. Unlike the rest of the store they outlive a
 * persona switch, so Bishnu finds the request on his dashboard. reset() and stop() wipe them.
 */
async function loadHandoff(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(HANDOFF_KEY);
    return raw ? (JSON.parse(raw) as Booking[]) : [];
  } catch {
    return [];
  }
}

async function saveHandoff(bookings: Booking[]): Promise<void> {
  await AsyncStorage.setItem(HANDOFF_KEY, JSON.stringify(bookings)).catch(() => {});
}

function freshStore(
  persona: DemoPersona,
  handoff: Booking[] = [],
  earnings: GuideEarnings = clone(GUIDE_EARNINGS),
): DemoStore {
  // A guide only sees requests for his own tours; newest scan-led requests go first.
  const forBishnu = handoff.filter((b) => b.tour.guideId === GUIDE_PROFILE.id && b.status !== 'CANCELLED');
  return {
    persona,
    startedAt: new Date().toISOString(),
    travelerBookings: persona === 'traveler-aanya' ? [...clone(handoff), ...clone(TRAVELER_BOOKINGS)] : [],
    guideIncoming: persona === 'guide-bishnu' ? [...clone(forBishnu), ...clone(GUIDE_INCOMING_BOOKINGS)] : [],
    guideEarnings: clone(earnings),
    authoredReviews: persona === 'traveler-aanya' ? clone(TRAVELER_REVIEWS) : [],
    wishlist: persona === 'traveler-aanya' ? [...TRAVELER_WISHLIST] : [],
    nudgeImpressions: {},
  };
}

async function persist() {
  if (!store) {
    await AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store)).catch(() => {});
}

async function hydrate(): Promise<DemoStore | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoStore;
    if (parsed.persona !== 'traveler-aanya' && parsed.persona !== 'guide-bishnu') return null;
    if (!parsed.guideEarnings) parsed.guideEarnings = clone(GUIDE_EARNINGS);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Called at app start. Re-hydrates demo state if a previous session exists.
 * Idempotent — safe to call from AuthContext bootstrap multiple times.
 */
export function bootstrapDemo(): Promise<DemoStore | null> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = hydrate().then((s) => {
    store = s;
    return s;
  });
  return bootstrapPromise;
}

export function isActive(): boolean {
  return !!store;
}

export function getCurrentPersona(): DemoPersona | null {
  return store?.persona ?? null;
}

export function getCurrentUser(): AuthUser | null {
  if (!store) return null;
  return store.persona === 'traveler-aanya' ? TRAVELER_USER : GUIDE_USER;
}

export async function start(persona: DemoPersona): Promise<AuthUser> {
  // Always wipe before starting fresh — no cross-contamination between personas.
  store = freshStore(persona);
  await persist();
  return persona === 'traveler-aanya' ? TRAVELER_USER : GUIDE_USER;
}

/** Change persona inside one demo run, carrying scan-led bookings across to the other side. */
export async function switchPersona(persona: DemoPersona): Promise<AuthUser> {
  const earnings = store?.guideEarnings ?? clone(GUIDE_EARNINGS);
  store = freshStore(persona, await loadHandoff(), earnings);
  await persist();
  return persona === 'traveler-aanya' ? TRAVELER_USER : GUIDE_USER;
}

export async function reset(): Promise<void> {
  if (!store) return;
  await AsyncStorage.removeItem(HANDOFF_KEY).catch(() => {});
  store = freshStore(store.persona);
  await persist();
}

export async function stop(): Promise<void> {
  store = null;
  bootstrapPromise = null;
  await AsyncStorage.multiRemove([STORAGE_KEY, HANDOFF_KEY]).catch(() => {});
}

// ─── Read APIs (used by api.ts) ──────────────────────────────────────────────

export function listTours(): Tour[] {
  // Both personas see the full catalog — Bishnu's tours plus the Tokha and
  // Kathmandu Valley tours from the other guides.
  return clone(CATALOG_TOURS);
}

export function getTour(id: string): Tour {
  const tour = CATALOG_TOURS.find((t) => t.id === id);
  if (!tour) throw new Error(`Demo tour ${id} not found`);
  // Attach reviews on read so the detail screen has them.
  return clone({ ...tour, reviews: ALL_REVIEWS.filter((r) => r.tourId === id) });
}

export function listFeatured(): Tour[] {
  return clone(FEATURED_TOURS);
}

export function getGuide(id: string): Guide {
  const guide = DEMO_GUIDES.find((g) => g.id === id);
  if (!guide) throw new Error('Demo guide not found');
  // Attach this guide's own tours from the catalog.
  return clone({ ...guide, tours: CATALOG_TOURS.filter((t) => t.guideId === id) });
}

export function listReviewsForTour(tourId: string): Review[] {
  if (!store) return clone(ALL_REVIEWS.filter((r) => r.tourId === tourId));
  // Merge user-authored reviews with seed reviews.
  return clone([
    ...store.authoredReviews.filter((r) => r.tourId === tourId),
    ...ALL_REVIEWS.filter((r) => r.tourId === tourId),
  ]);
}

// ─── Traveler-side bookings ──────────────────────────────────────────────────

export function listTravelerBookings(
  status?: 'upcoming' | 'past' | 'cancelled',
): Booking[] {
  if (!store || store.persona !== 'traveler-aanya') return [];
  const now = new Date();
  return clone(
    store.travelerBookings.filter((b) => {
      const bookingDate = new Date(b.bookingDate);
      if (status === 'upcoming') return bookingDate >= now && b.status !== 'CANCELLED';
      if (status === 'past') return bookingDate < now || b.status === 'COMPLETED';
      if (status === 'cancelled') return b.status === 'CANCELLED';
      return true;
    }),
  );
}

export async function createTravelerBooking(payload: {
  tourId: string;
  scheduleId: string;
  bookingDate: string;
  partySize: number;
  notes?: string;
  monument?: { id: string; name: string };
}): Promise<Booking> {
  if (!store) throw new Error('Demo session not active');
  if (store.persona !== 'traveler-aanya') {
    throw new Error('Only the traveler persona can create bookings');
  }
  const tour = getTour(payload.tourId);
  const schedule = tour.schedules?.find((s) => s.id === payload.scheduleId);
  if (!schedule) throw new Error('Schedule not found');

  const booking: Booking = {
    id: `booking-demo-${Date.now()}`,
    tourId: payload.tourId,
    scheduleId: payload.scheduleId,
    userId: TRAVELER_USER.id,
    bookingDate: payload.bookingDate,
    partySize: payload.partySize,
    // A request that began with a scan waits for the guide to accept it.
    status: payload.monument ? 'PENDING' : 'CONFIRMED',
    notes: payload.monument
      ? [`Booked after scanning ${payload.monument.name}.`, payload.notes].filter(Boolean).join(' ')
      : payload.notes,
    createdAt: new Date().toISOString(),
    tour,
    schedule,
    monumentId: payload.monument?.id,
    monumentName: payload.monument?.name,
  };

  store.travelerBookings = [booking, ...store.travelerBookings];
  await persist();
  if (payload.monument) await saveHandoff([booking, ...(await loadHandoff())]);
  return clone(booking);
}

export async function cancelTravelerBooking(id: string): Promise<void> {
  if (!store) return;
  store.travelerBookings = store.travelerBookings.map((b) =>
    b.id === id ? { ...b, status: 'CANCELLED' as const } : b,
  );
  await persist();
  await saveHandoff((await loadHandoff()).filter((b) => b.id !== id));
}

export async function tipTravelerBooking(
  id: string,
  amount: number,
  currency: string,
): Promise<void> {
  if (!store) return;
  store.travelerBookings = store.travelerBookings.map((b) =>
    b.id === id ? { ...b, tipAmount: amount, tipCurrency: currency, status: 'COMPLETED' as const } : b,
  );
  await persist();
}

export async function addReview(payload: {
  tourId: string;
  rating: number;
  title?: string;
  comment: string;
}): Promise<Review> {
  if (!store) throw new Error('Demo session not active');
  const review: Review = {
    id: `review-demo-${Date.now()}`,
    tourId: payload.tourId,
    userId: TRAVELER_USER.id,
    rating: payload.rating,
    title: payload.title,
    comment: payload.comment,
    createdAt: new Date().toISOString(),
    user: { name: TRAVELER_USER.name, avatar: TRAVELER_USER.avatar ?? undefined },
  };
  store.authoredReviews = [review, ...store.authoredReviews];
  await persist();
  return clone(review);
}

/** Reviews authored by the active persona during (and seeded into) this session. */
export function listMyReviews(): Review[] {
  if (!store) return [];
  return clone(store.authoredReviews);
}

// ─── Wishlist ────────────────────────────────────────────────────────────────

export function getWishlist(): string[] {
  return store ? [...store.wishlist] : [];
}

/** Resolve wishlisted tour IDs to full Tour objects from the catalog. */
export function getWishlistTours(): Tour[] {
  if (!store) return [];
  return store.wishlist
    .map((id) => CATALOG_TOURS.find((t) => t.id === id))
    .filter((t): t is Tour => !!t)
    .map((t) => clone(t));
}

export async function toggleWishlist(tourId: string): Promise<boolean> {
  if (!store) return false;
  const has = store.wishlist.includes(tourId);
  store.wishlist = has ? store.wishlist.filter((id) => id !== tourId) : [...store.wishlist, tourId];
  await persist();
  return !has;
}

// ─── Guide-side reads ────────────────────────────────────────────────────────

export function listGuideIncoming(): Booking[] {
  if (!store || store.persona !== 'guide-bishnu') return [];
  return clone(store.guideIncoming.filter((b) => b.status !== 'CANCELLED'));
}

export function getGuideEarnings(): GuideEarnings {
  if (!store) return clone(GUIDE_EARNINGS);
  return clone(store.guideEarnings);
}

/**
 * Bishnu Accept / Decline on an incoming booking.
 * Updates both the guide inbox and the traveler handoff so Aanya's Trips tab
 * reflects CONFIRMED / CANCELLED after a persona switch. Accepting credits the
 * expected tip ("tour price") onto the earnings card.
 */
export async function respondToIncomingBooking(
  bookingId: string,
  status: 'CONFIRMED' | 'CANCELLED',
): Promise<Booking> {
  if (!store) throw new Error('Demo session not active');
  if (store.persona !== 'guide-bishnu') {
    throw new Error('Only the guide persona can accept or decline bookings');
  }

  const existing = store.guideIncoming.find((b) => b.id === bookingId);
  if (!existing) throw new Error(`Incoming booking ${bookingId} not found`);
  if (existing.status !== 'PENDING') {
    throw new Error(`Illegal booking transition: ${existing.status} → ${status}`);
  }

  const updated: Booking = { ...existing, status };
  store.guideIncoming = store.guideIncoming.map((b) => (b.id === bookingId ? updated : b));
  store.travelerBookings = store.travelerBookings.map((b) =>
    b.id === bookingId ? { ...b, status } : b,
  );

  const handoff = await loadHandoff();
  const nextHandoff =
    status === 'CANCELLED'
      ? handoff.filter((b) => b.id !== bookingId)
      : handoff.map((b) => (b.id === bookingId ? { ...b, status } : b));
  await saveHandoff(nextHandoff);

  if (status === 'CONFIRMED') {
    const price = demoTourPriceUsd(updated);
    const earnings = clone(store.guideEarnings);
    earnings.last7DaysUsd += price;
    earnings.last30DaysUsd += price;
    earnings.allTimeUsd += price;
    earnings.bookingsLast7Days += 1;
    earnings.bookingsLast30Days += 1;
    earnings.payoutPendingUsd += price;
    if (earnings.daily.length > 0) {
      const today = earnings.daily[earnings.daily.length - 1]!;
      today.tipUsd += price;
    }
    store.guideEarnings = earnings;
  }

  await persist();
  return clone(updated);
}

export function listGuideOwnTours(): Tour[] {
  if (!store || store.persona !== 'guide-bishnu') return [];
  return clone(BISHNU_TOURS);
}

export function getGuideOwnReviews(): Review[] {
  if (!store || store.persona !== 'guide-bishnu') return [];
  return clone(BISHNU_REVIEWS);
}

// ─── Conversion-nudge counters ───────────────────────────────────────────────

export async function recordNudgeImpression(nudgeId: string): Promise<number> {
  if (!store) return 0;
  store.nudgeImpressions[nudgeId] = (store.nudgeImpressions[nudgeId] ?? 0) + 1;
  await persist();
  return store.nudgeImpressions[nudgeId];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

// Export an aggregate for convenience — most callers will `import * as demo from ...`
// but we also expose a default object so api.ts and screens can read clearly.
export const demoSession = {
  bootstrapDemo,
  isActive,
  getCurrentPersona,
  getCurrentUser,
  start,
  switchPersona,
  reset,
  stop,
  demoTokensFor,
  isDemoToken,
  personaFromToken,
  // reads
  listTours,
  getTour,
  listFeatured,
  getGuide,
  listReviewsForTour,
  listTravelerBookings,
  createTravelerBooking,
  cancelTravelerBooking,
  tipTravelerBooking,
  addReview,
  listMyReviews,
  getWishlist,
  getWishlistTours,
  toggleWishlist,
  listGuideIncoming,
  getGuideEarnings,
  respondToIncomingBooking,
  demoTourPriceUsd,
  listGuideOwnTours,
  getGuideOwnReviews,
  recordNudgeImpression,
};
