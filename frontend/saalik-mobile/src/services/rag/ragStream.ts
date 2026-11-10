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
