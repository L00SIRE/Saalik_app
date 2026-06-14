// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 · Integration / Controls — AI service CONTRACT
//
// This interface is the seam between the app and "where AI comes from". Layers
// 1–3 (UI, State, Logic) depend ONLY on this contract — never on a concrete
// implementation. Today it is fulfilled by an in-memory mock (pitch demo);
// post-funding the live implementation is swapped in behind `registry.ts`
// without touching a single consumer.
//
// Optional methods are deliberate structural hooks for the AI roadmap
// (vector embeddings → custom local DB, image detection) so Logic can be
// written against them before the live backend exists.
// ─────────────────────────────────────────────────────────────────────────────

export type AiRole = 'user' | 'assistant';

/**
 * Coarse intent buckets. Owned by the contract because the Integration layer
 * may use an `intentHint` to select canned mock content; the live layer ignores
 * it and lets the model decide. The classifier that PRODUCES an intent lives in
 * the Logic layer (`@logic/ai/intent`).
 */
export type AiIntent =
  | 'trip'
  | 'food'
  | 'temple'
  | 'tours'
  | 'nepali'
  | 'landmark'
  | 'default';

export interface AiTurn {
  role: AiRole;
  content: string;
}

/** A tappable quick-action suggestion rendered as a chip in the UI. */
export interface AiSuggestion {
  /** Chip label. */
  text: string;
  /** Ionicons glyph name. */
  icon: string;
  /** The prompt actually sent when the chip is tapped. */
  message: string;
}

/**
 * An optional structured action the Logic/UI layers can react to. The current
 * pitch demo only ever emits `none`; `redirect_help` is the hook for the future
 * "image detection that redirects to help pages" flow.
 */
export type AiAction =
  | { type: 'none' }
  | { type: 'redirect_help'; topic: string; landmarkId?: string };

export interface AiConversationContext {
  tourId?: string;
  persona?: string | null;
  /** Intent computed by the Logic layer; mock impl uses it to pick content. */
  intentHint?: AiIntent;
}

export interface AiMessageInput {
  message: string;
  history: AiTurn[];
  context?: AiConversationContext;
}

export interface AiReply {
  text: string;
  action: AiAction;
}

/**
 * FUTURE hook — a context document retrieved from a vector store. The live impl
 * will populate `score`/`source` from embeddings; the mock returns an empty set
 * so RAG-aware code can be written today.
 */
export interface RetrievedDoc {
  id: string;
  text: string;
  score: number;
  source?: string;
}

/** Reference to an image for the future on-device/server detection path. */
export interface ImageRef {
  uri: string;
  mimeType?: string;
}

export interface AiService {
  /** Send a user message + history; receive the assistant's reply. */
  sendMessage(input: AiMessageInput): Promise<AiReply>;
  /** Quick-action chips shown above the composer. */
  getSuggestions(): Promise<AiSuggestion[]>;
  /** Opening assistant greeting for a fresh conversation. */
  getGreeting(): string;

  // ── Roadmap hooks (optional until the live backend lands) ──────────────────
  /** Vector-RAG retrieval: embed `query`, return nearest context docs. */
  retrieveContext?(query: string): Promise<RetrievedDoc[]>;
  /** Image detection → a help/redirect action (e.g. identify a landmark). */
  detectImage?(image: ImageRef): Promise<AiAction>;
}
