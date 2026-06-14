// ─────────────────────────────────────────────────────────────────────────────
// Layer 3 · Decision-Making / Logic — MONETIZATION POLICY  (STRICT BOUNDARY)
//
// SECURITY / INTEGRITY: this module is the single source of truth for tip,
// premium-tour, and featured-listing economics. UI components MUST NEVER
// compute money — they call these pure functions. The numbers below come from
// the gitignored GROWTH_STRATEGY.md and are the only place to change them.
//
// Separation of duties:
//   • THIS layer (Logic)        → decides AMOUNTS and ELIGIBILITY (pure, testable)
//   • Integration (Layer 4)     → EXECUTES payments behind a PaymentsService
//                                 contract (Stripe Connect + Khalti/eSewa payout)
//   • UI (Layer 1)              → only displays the breakdown these return
//
// SCAFFOLD: defined now to lock the boundary; payment EXECUTION + UI wiring are
// tracked follow-ups (build-cost ~6 eng weeks per the strategy doc).
// ─────────────────────────────────────────────────────────────────────────────

/** Tip commission — 15% gross (GROWTH_STRATEGY §3.1). */
export const TIP_TAKE_RATE = 0.15;
/** Rebate for verified guides in good standing — 3% (§3.1). */
export const VERIFIED_GUIDE_REBATE = 0.03;
/** Premium multi-day experiences — 18% commission (§3.4). */
export const PREMIUM_TAKE_RATE = 0.18;

export interface TipBreakdown {
  grossTip: number;
  /** Saalik's net take after any verified-guide rebate. */
  platformFee: number;
  /** What the guide ultimately receives. */
  guidePayout: number;
  currency: string;
  appliedRate: number;
}

/** Compute the tip split. Verified guides in good standing get the 3% rebate. */
export function computeTipBreakdown(
  grossTip: number,
  currency: string,
  opts?: { verifiedGuide?: boolean },
): TipBreakdown {
  const appliedRate = TIP_TAKE_RATE - (opts?.verifiedGuide ? VERIFIED_GUIDE_REBATE : 0);
  const platformFee = round2(grossTip * appliedRate);
  return {
    grossTip: round2(grossTip),
    platformFee,
    guidePayout: round2(grossTip - platformFee),
    currency,
    appliedRate,
  };
}

/** Commission split for a fixed-price premium experience. */
export function computePremiumSplit(price: number, currency: string) {
  const platformFee = round2(price * PREMIUM_TAKE_RATE);
  return { price: round2(price), platformFee, guidePayout: round2(price - platformFee), currency };
}

/** Featured-listing eligibility gate — 4.6★ + 20 completed tours (§3.2). */
export function isFeaturedEligible(guide: { rating: number; totalTours: number }): boolean {
  return guide.rating >= 4.6 && guide.totalTours >= 20;
}

/** Verified-guide rebate gate — 4.7★ and zero no-shows trailing 30d (§3.1). */
export function qualifiesForRebate(guide: { rating: number; noShows30d: number }): boolean {
  return guide.rating >= 4.7 && guide.noShows30d === 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
