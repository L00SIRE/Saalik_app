// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 · Integration / Controls — DISCOVERY service LIVE implementation
//
// There is no live discovery backend yet — the heritage index is curated and
// local-first by design. Until the vector store + image-detection model land,
// the live impl delegates to the curated index. When they ship, swap the two
// `identify*` methods to call them; nothing above Layer 4 changes.
// ─────────────────────────────────────────────────────────────────────────────

import type { DiscoveryService, Landmark } from '../contracts/discovery';
import type { ImageRef } from '../contracts/ai';
import { mockDiscoveryService } from '../mock/discoveryService.mock';

export const liveDiscoveryService: DiscoveryService = {
  identify: (query: string): Promise<Landmark | null> => mockDiscoveryService.identify(query),
  getSuggestions: (): Promise<string[]> => mockDiscoveryService.getSuggestions(),
  // TODO(post-funding): call the image-detection endpoint / vector store.
  identifyImage: (image: ImageRef): Promise<Landmark | null> =>
    mockDiscoveryService.identifyImage!(image),
};
