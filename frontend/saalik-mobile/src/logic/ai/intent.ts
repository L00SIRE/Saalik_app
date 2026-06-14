// ─────────────────────────────────────────────────────────────────────────────
// Layer 3 · Decision-Making / Logic — AI intent pre-processing
//
// Pure, UI-independent business rules. The Logic layer decides WHAT the user
// wants (intent) and WHAT we should do about it (action), then hands the
// Integration layer a hint. This is where the future "image detection redirects
// to a help page" rule lives — independent of any model or backend.
// ─────────────────────────────────────────────────────────────────────────────

import type { AiIntent, AiAction } from '@integration/contracts/ai';

/**
 * Classify a free-text message into a coarse intent. Order matters: the
 * landmark/identification check runs first because phrases like
 * "what temple is this" also contain the word "temple".
 */
export function classifyIntent(message: string): AiIntent {
  const msg = message.toLowerCase();

  if (
    /\b(identify|recogni[sz]e|scan)\b/.test(msg) ||
    /what (is )?(this|that|temple|place|landmark|building)/.test(msg) ||
    /which (temple|place|landmark)/.test(msg) ||
    msg.includes('this photo') ||
    msg.includes('this picture')
  ) {
    return 'landmark';
  }

  if (msg.includes('trip') || msg.includes('plan') || msg.includes('day')) return 'trip';
  if (msg.includes('food') || msg.includes('eat') || msg.includes('restaurant')) return 'food';
  if (msg.includes('temple') || msg.includes('etiquette') || msg.includes('dress')) return 'temple';
  if (msg.includes('tour') || msg.includes('today') || msg.includes('available')) return 'tours';
  if (
    msg.includes('nepali') ||
    msg.includes('language') ||
    msg.includes('phrase') ||
    msg.includes('greeting')
  ) {
    return 'nepali';
  }

  return 'default';
}

/**
 * Decide the structured side-effect for a classified intent. Today only the
 * landmark intent produces an action (the roadmap "redirect to help page"
 * hook); everything else is conversational text only.
 */
export function deriveAction(intent: AiIntent, _message: string): AiAction {
  if (intent === 'landmark') {
    return { type: 'redirect_help', topic: 'landmark-identification' };
  }
  return { type: 'none' };
}
