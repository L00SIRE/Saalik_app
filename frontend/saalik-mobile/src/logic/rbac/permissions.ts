// ─────────────────────────────────────────────────────────────────────────────
// Layer 3 · Decision-Making / Logic — RBAC permission catalog
//
// The single source of truth for "who can do what". UI and navigation ask
// `can(role, capability)` instead of branching on `role === 'GUIDE'` inline.
//
// ADMIN currently has "god access" (the wildcard). The design is intentionally
// granular-ready: when we introduce staff sub-roles, replace the ADMIN wildcard
// with explicit per-staff capability sets — every call site of `can()` keeps
// working unchanged.
//
// SCAFFOLD: defined and unit-testable now; not yet wired into the navigators.
// Wiring is a tracked follow-up so we don't risk the live demo in this pass.
// ─────────────────────────────────────────────────────────────────────────────

import type { UserRole } from '@app-types/auth';

export type Capability =
  // Traveler surface
  | 'tour:view'
  | 'tour:book'
  | 'booking:cancel'
  | 'review:write'
  | 'tip:send'
  // Guide surface
  | 'guide:dashboard:view'
  | 'guide:tour:manage'
  | 'guide:booking:respond'
  | 'guide:payout:view'
  | 'featured:purchase'
  // Admin / staff surface
  | 'admin:panel:view'
  | 'admin:user:manage'
  | 'admin:payout:approve'
  | 'admin:guide:verify';

const TRAVELER_CAPS: Capability[] = [
  'tour:view',
  'tour:book',
  'booking:cancel',
  'review:write',
  'tip:send',
];

const GUIDE_CAPS: Capability[] = [
  ...TRAVELER_CAPS,
  'guide:dashboard:view',
  'guide:tour:manage',
  'guide:booking:respond',
  'guide:payout:view',
  'featured:purchase',
];

/** Sentinel meaning "every capability" — today's ADMIN god-access. */
const WILDCARD = '*' as const;

const ROLE_CAPABILITIES: Record<UserRole, Capability[] | typeof WILDCARD> = {
  TRAVELER: TRAVELER_CAPS,
  GUIDE: GUIDE_CAPS,
  ADMIN: WILDCARD,
};

/** Does `role` have `capability`? Unknown/missing role → denied. */
export function can(role: UserRole | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  const caps = ROLE_CAPABILITIES[role];
  if (caps === WILDCARD) return true;
  return caps.includes(capability);
}

/** Full capability list for a role (`'all'` for wildcard roles). */
export function capabilitiesFor(role: UserRole): Capability[] | 'all' {
  const caps = ROLE_CAPABILITIES[role];
  return caps === WILDCARD ? 'all' : [...caps];
}
