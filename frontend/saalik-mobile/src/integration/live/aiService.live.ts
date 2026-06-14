// ─────────────────────────────────────────────────────────────────────────────
// Layer 4 · Integration / Controls — AI service LIVE implementation
//
// Talks to the real backend (`POST /api/ai/chat`). This file is the ONLY thing
// that changes when we flip from demo to production AI — layers 1–3 are
// untouched. Greeting/suggestions reuse the mock copy for now (the backend
// already exposes `GET /ai/suggestions`; wire it in when the live cutover lands).
// ─────────────────────────────────────────────────────────────────────────────

import type {
  AiService,
  AiMessageInput,
  AiReply,
  AiSuggestion,
  RetrievedDoc,
  ImageRef,
  AiAction,
} from '../contracts/ai';
import { mockAiService } from '../mock/aiService.mock';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const liveAiService: AiService = {
  // Static copy — keep client-side until the backend owns it.
  getGreeting: () => mockAiService.getGreeting(),
  getSuggestions: (): Promise<AiSuggestion[]> => mockAiService.getSuggestions(),

  async sendMessage(input: AiMessageInput): Promise<AiReply> {
    const res = await fetch(`${BASE_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The current backend contract accepts `{ message }` and returns
      // `{ message, timestamp }`. History/context are sent for forward-compat.
      body: JSON.stringify({
        message: input.message,
        history: input.history,
        context: input.context,
      }),
    });

    if (!res.ok) {
      throw new Error(`AI request failed (${res.status})`);
    }

    const data = (await res.json()) as { message: string };
    return { text: data.message, action: { type: 'none' } };
  },

  // ── Roadmap hooks — implemented post-funding ───────────────────────────────
  async retrieveContext(_query: string): Promise<RetrievedDoc[]> {
    // TODO(post-funding): embed `query` and query the vector DB.
    return [];
  },

  async detectImage(_image: ImageRef): Promise<AiAction> {
    // TODO(post-funding): call the image-detection endpoint, map to an action.
    return { type: 'none' };
  },
};
