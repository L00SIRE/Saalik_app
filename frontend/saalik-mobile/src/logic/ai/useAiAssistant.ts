// ─────────────────────────────────────────────────────────────────────────────
// Layer 3 · Decision-Making / Logic — AI assistant orchestration hook
//
// The single entry point the UI (Layer 1) consumes for the AI assistant. It:
//   1. owns conversation state,
//   2. pre-processes each message (intent classification — a business rule),
//   3. calls the Integration layer (Layer 4) via the service registry,
//   4. derives any structured action (e.g. redirect-to-help).
//
// The screen stays "dumb": it renders `messages` and calls `send`. It has no
// idea whether the reply came from a mock or a live model.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useRef, useState } from 'react';
import { services } from '@integration';
import type { AiAction, AiSuggestion, AiTurn } from '@integration/contracts/ai';
import { classifyIntent, deriveAction } from './intent';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  /** Optional structured side-effect (roadmap hook), e.g. redirect-to-help. */
  action?: AiAction;
}

export interface UseAiAssistant {
  messages: ChatMessage[];
  suggestions: AiSuggestion[];
  isThinking: boolean;
  send: (text: string) => Promise<void>;
  clear: () => void;
}

export function useAiAssistant(context?: { tourId?: string; persona?: string | null }): UseAiAssistant {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [isThinking, setIsThinking] = useState(false);

  const seq = useRef(0);
  const nextId = useCallback(() => `m${Date.now()}_${seq.current++}`, []);

  // Seed the greeting + suggestions once on mount (all content via Layer 4).
  useEffect(() => {
    let active = true;
    setMessages([
      { id: 'greeting', role: 'assistant', content: services.ai.getGreeting(), timestamp: new Date() },
    ]);
    services.ai
      .getSuggestions()
      .then((s) => {
        if (active) setSuggestions(s);
      })
      .catch(() => {
        /* suggestions are non-critical; ignore */
      });
    return () => {
      active = false;
    };
  }, []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const userMsg: ChatMessage = {
        id: nextId(),
        role: 'user',
        content: trimmed,
        timestamp: new Date(),
      };

      const priorHistory: AiTurn[] = messages.map((m) => ({ role: m.role, content: m.content }));
      setMessages((prev) => [...prev, userMsg]);
      setIsThinking(true);

      // ── Logic pre-processing: classify intent before hitting Integration ──
      const intent = classifyIntent(trimmed);

      try {
        const reply = await services.ai.sendMessage({
          message: trimmed,
          history: [...priorHistory, { role: 'user', content: trimmed }],
          context: { ...context, intentHint: intent },
        });

        // A server-provided action wins; otherwise derive one from the intent.
        const action: AiAction =
          reply.action.type !== 'none' ? reply.action : deriveAction(intent, trimmed);

        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'assistant', content: reply.text, timestamp: new Date(), action },
        ]);
      } catch {
        // Graceful fallback keeps the experience seamless even if a live call
        // fails — the demo never sees this because the mock never throws.
        setMessages((prev) => [
          ...prev,
          {
            id: nextId(),
            role: 'assistant',
            content: 'I drifted into a daydream for a moment. Could you ask that again?',
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsThinking(false);
      }
    },
    [messages, context, nextId],
  );

  const clear = useCallback(() => {
    seq.current = 0;
    setMessages([
      { id: 'greeting', role: 'assistant', content: services.ai.getGreeting(), timestamp: new Date() },
    ]);
  }, []);

  return { messages, suggestions, isThinking, send, clear };
}
