// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 · Integration / Controls — DISCOVERY service MOCK implementation
//
// Backed by the curated local heritage index in `services/landmarks.ts` (the
// canonical demo dataset — see SCAN_KEYWORDS_PRIVATE.md). The Scan screen no
// longer touches that module directly; it goes UI → Logic → here.
// ─────────────────────────────────────────────────────────────────────────────

import { matchLandmark, SCAN_SUGGESTIONS } from '@services/landmarks';
import type { DiscoveryService, Landmark } from '../contracts/discovery';
import type { ImageRef } from '../contracts/ai';

export const mockDiscoveryService: DiscoveryService = {
  async identify(query: string): Promise<Landmark | null> {
    return matchLandmark(query);
  },

  async getSuggestions(): Promise<string[]> {
    return SCAN_SUGGESTIONS;
  },

  async identifyImage(image: ImageRef): Promise<Landmark | null> {
    // No on-device model in the demo — match on the file/uri name, which is how
    // the current "upload a photo" flow already behaves.
    return matchLandmark(image.uri);
  },
};
