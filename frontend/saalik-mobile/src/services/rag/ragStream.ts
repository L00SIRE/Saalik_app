import type { HeritageMonument, HeritageSource, LoreCategory } from '../../types/heritage';

export type StoryTab = 'STORY_HOOK' | 'ICONOGRAPHY' | 'DYNASTY_TIMELINE';

export const STORY_TABS: { key: StoryTab; label: string }[] = [
  { key: 'STORY_HOOK', label: '60s Story Hook' },
  { key: 'ICONOGRAPHY', label: 'Iconography Decoder' },
  { key: 'DYNASTY_TIMELINE', label: 'Dynasty Timeline' },
];

export interface RagContext {
  text: string;
  citations: string[];
  confidence: 'high' | 'medium' | 'low' | null;
}

function chunk(monument: HeritageMonument, category: LoreCategory) {
  return monument.loreChunks.find((c) => c.category === category);
}

function citationsFor(sourceIds: string[], sources: HeritageSource[]): string[] {
  return sourceIds.map((id) => sources.find((s) => s.id === id)?.citation ?? id);
}

/** Assembles the hierarchical RAG context for one tab from the monument's lore chunks. */
export function buildTabContext(
  monument: HeritageMonument,
  tab: StoryTab,
  sources: HeritageSource[],
  zoneMonuments: HeritageMonument[],
): RagContext {
  if (tab === 'STORY_HOOK') {
    return { text: monument.audioHook.script, citations: [], confidence: null };
  }

  if (tab === 'ICONOGRAPHY') {
    const icon = chunk(monument, 'ICONOGRAPHY_SYMBOLISM');
    const cues = monument.visualCues;
    const decoder = [
      `How to recognise it: ${cues.distinguishingFeatures.join('; ')}.`,
      `Materials: ${cues.primaryMaterials.map((m) => m.replace(/_/g, ' ')).join(', ')}.`,
      `Do not confuse it with nearby shrines: ${cues.disambiguationTip}`,
    ].join(' ');
    return {
      text: `${icon?.text ?? ''}\n\n${decoder}`.trim(),
      citations: citationsFor(icon?.sourceIds ?? [], sources),
      confidence: icon?.confidence ?? null,
    };
  }

  const history = chunk(monument, 'HISTORY_DYNASTY');
  const timeline = zoneMonuments
    .filter((m) => m.era.foundingYearCE !== null)
    .sort((a, b) => (a.era.foundingYearCE ?? 0) - (b.era.foundingYearCE ?? 0))
    .map((m) => `${m.era.foundingYearCE} CE - ${m.names.en} (${m.era.dynasty})${m.id === monument.id ? ' <- you are here' : ''}`)
    .join('\n');
  return {
    text: `${monument.era.dynasty} period, ${monument.era.century}.\n\n${history?.text ?? ''}${timeline ? `\n\nDated monuments in this zone:\n${timeline}` : ''}`,
    citations: citationsFor(history?.sourceIds ?? [], sources),
    confidence: history?.confidence ?? null,
  };
}

const FOLLOW_UP_ROUTES: { category: LoreCategory; pattern: RegExp }[] = [
  { category: 'CONSERVATION_RESTORATION', pattern: /earthquake|2015|restor|rebuil|damage|conserv|repair|collaps/ },
  { category: 'LIVING_RITUALS_FOLKLORE', pattern: /festival|ritual|puja|worship|legend|myth|folk|jatra|tantr|pray|ceremon/ },
  { category: 'ICONOGRAPHY_SYMBOLISM', pattern: /god|deity|symbol|statue|carving|mean|icon|guardian|represent|image/ },
  { category: 'ARCHITECTURE_CRAFTSMANSHIP', pattern: /architect|roof|tier|wood|brick|stone|style|craft|material|design|tall|made of/ },
  { category: 'HISTORY_DYNASTY', pattern: /who|when|built|king|dynasty|century|history|old|year|found/ },
];

const words = (text: string) => text.toLowerCase().match(/[a-z0-9]{4,}/g) ?? [];

export const FOLLOW_UP_SUGGESTIONS = [
  'Who built it, and when?',
  'What do the carvings and statues mean?',
  'What rituals or festivals happen here?',
  'What happened in the 2015 earthquake?',
  'How do I tell it apart from nearby monuments?',
];

/**
 * Offline answer to a follow-up question, extracted from the monument's own lore chunks.
 * It routes the question to one of the five lore categories and returns the three sentences
 * that share the most words with it, so every answer stays inside the sourced corpus.
 */
export function answerFollowUp(monument: HeritageMonument, question: string, sources: HeritageSource[]): RagContext {
  const asked = question.toLowerCase();
  if (/apart|confus|differen|recogni|identif|nearby|mistake/.test(asked)) {
    const cues = monument.visualCues;
    return {
      text: `${cues.disambiguationTip} Look for: ${cues.distinguishingFeatures.join('; ')}.`,
      citations: [],
      confidence: null,
    };
  }

  const askedWords = new Set(words(asked));
  const overlap = (text: string) => words(text).filter((word) => askedWords.has(word)).length;
  const routed = FOLLOW_UP_ROUTES.find((route) => route.pattern.test(asked))?.category;
  const best =
    (routed && chunk(monument, routed)) ??
    monument.loreChunks.slice().sort((a, b) => overlap(b.text) - overlap(a.text))[0];
  if (!best) {
    return { text: 'Saalik has no written lore for this monument yet.', citations: [], confidence: null };
  }

  const sentences = best.text.match(/[^.!?]+[.!?]+/g) ?? [best.text];
  const ranked = sentences
    .map((sentence, index) => ({ sentence: sentence.trim(), index, score: overlap(sentence) }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .sort((a, b) => a.index - b.index);
  return {
    text: ranked.map((item) => item.sentence).join(' '),
    citations: citationsFor(best.sourceIds, sources),
    confidence: best.confidence,
  };
}

/**
 * Streams text word by word, emulating token streaming entirely offline.
 * Resolves when the full text has been emitted or the signal aborts.
 */
export function streamWords(
  text: string,
  onUpdate: (partial: string) => void,
  options: { intervalMs?: number; wordsPerTick?: number; signal?: { aborted: boolean } } = {},
): Promise<void> {
  const tokens = text.split(/(\s+)/);
  const wordsPerTick = Math.max(1, options.wordsPerTick ?? 2);
  const intervalMs = options.intervalMs ?? 35;
  let index = 0;
  let emitted = '';

  return new Promise((resolve) => {
    const tick = () => {
      if (options.signal?.aborted) {
        resolve();
        return;
      }
      let words = 0;
      while (index < tokens.length && words < wordsPerTick) {
        const token = tokens[index]!;
        emitted += token;
        if (token.trim()) words += 1;
        index += 1;
      }
      onUpdate(emitted);
      if (index >= tokens.length) {
        resolve();
        return;
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}
