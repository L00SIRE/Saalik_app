// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 · Integration / Controls — SERVICE REGISTRY (the single swap point)
//
// This is the ONE place that decides mock vs. live. Post-funding, flipping the
// flag (or overriding a single service) is the entire migration — layers 1–3
// never learn where the data came from.
//
// `EXPO_PUBLIC_USE_MOCK` is finally wired here. We DEFAULT TO MOCK so the pitch
// demo is seamless even when the var is unset; only an explicit value of
// 'false' flips to live. (Reminder: Expo inlines `EXPO_PUBLIC_*` at build time —
// restart Metro after changing it.)
// ─────────────────────────────────────────────────────────────────────────────

import type { AiService } from './contracts/ai';
import type { DiscoveryService } from './contracts/discovery';
import { mockAiService } from './mock/aiService.mock';
import { liveAiService } from './live/aiService.live';
import { mockDiscoveryService } from './mock/discoveryService.mock';
import { liveDiscoveryService } from './live/discoveryService.live';

export const USE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK !== 'false';

/**
 * The capability surface consumed by Logic (Layer 3). As we migrate the rest of
 * the app off the legacy `services/api.ts`, each domain gets a contract here:
 *
 *   tours:    ToursService
 *   bookings: BookingsService
 *   reviews:  ReviewsService
 *   guides:   GuidesService
 *   auth:     AuthService
 *   payments: PaymentsService   // strict-isolation boundary (tips/premium)
 */
export interface ServiceRegistry {
  ai: AiService;
  discovery: DiscoveryService;
}

export const services: ServiceRegistry = {
  ai: USE_MOCK ? mockAiService : liveAiService,
  discovery: USE_MOCK ? mockDiscoveryService : liveDiscoveryService,
};
