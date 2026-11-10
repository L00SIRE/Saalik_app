import * as fs from 'fs';
import * as path from 'path';
import type {
  CaptureAngle,
  LoreCategory,
  LoreChunk,
  MonumentRecord,
  SourceCitation,
  WalkingTourRecord,
} from '../types/heritage';

interface RawLoreChunk {
  chunkId: string;
  nodePath: string;
  monumentId: string;
  category: LoreCategory;
  title: string;
  text: string;
  sourceIds: string[];
  confidence: 'high' | 'medium' | 'low';
}

interface RawCorpus {
  sources: Array<{ id: string; citation: string; url?: string }>;
  walkingTours: Array<{
    tourId: string;
    zoneId: string;
    title: string;
    titleNe?: string;
    startPoint: string;
    stopMonumentIds: string[];
    totalDistanceM: number;
    totalDurationMinutes: number;
  }>;
  loreChunks: RawLoreChunk[];
  monuments: Array<{
    id: string;
    zoneId: string;
    nodePath: string;
    names: { en: string; ne: string; romanized?: string };
    monumentType: string;
    tradition: string;
    geo: { lat: number; lng: number; elevationM?: number; geofenceRadiusM: number };
    visualCues: { confusableWith: string[]; disambiguationTip?: string };
    loreChunkIds?: string[];
    referenceEmbeddings: Array<{ angle: CaptureAngle; vector: number[] }>;
  }>;
}

function defaultCorpusPath(): string {
  return path.resolve(__dirname, '../../../data/nepal_heritage_seed/master_rag_corpus.json');
}

export interface LoadedCorpus {
  monuments: MonumentRecord[];
  walkingTours: WalkingTourRecord[];
  sources: SourceCitation[];
}

export function loadHeritageCorpus(corpusPath: string = defaultCorpusPath()): LoadedCorpus {
  const raw = JSON.parse(fs.readFileSync(corpusPath, 'utf8')) as RawCorpus;
  const loreByMonument = new Map<string, LoreChunk[]>();

  for (const chunk of raw.loreChunks ?? []) {
    const list = loreByMonument.get(chunk.monumentId) ?? [];
    list.push({
      chunkId: chunk.chunkId,
      category: chunk.category,
      title: chunk.title,
      text: chunk.text,
      sourceIds: chunk.sourceIds,
      confidence: chunk.confidence,
      nodePath: chunk.nodePath,
    });
    loreByMonument.set(chunk.monumentId, list);
  }

  const monuments: MonumentRecord[] = raw.monuments.map((m) => ({
    id: m.id,
    zoneId: m.zoneId,
    nodePath: m.nodePath,
    names: m.names,
    monumentType: m.monumentType,
    tradition: m.tradition,
    geo: {
      lat: m.geo.lat,
      lng: m.geo.lng,
      elevationM: m.geo.elevationM,
      geofenceRadiusM: m.geo.geofenceRadiusM,
    },
    visualCues: {
      confusableWith: m.visualCues.confusableWith,
      disambiguationTip: m.visualCues.disambiguationTip,
    },
    loreChunks: loreByMonument.get(m.id) ?? [],
    referenceEmbeddings: m.referenceEmbeddings,
  }));

  const walkingTours: WalkingTourRecord[] = raw.walkingTours.map((t) => {
    const firstStop = monuments.find((m) => m.id === t.stopMonumentIds[0]);
    return {
      tourId: t.tourId,
      zoneId: t.zoneId,
      title: t.title,
      titleNe: t.titleNe,
      startPoint: t.startPoint,
      meetingLat: firstStop?.geo.lat ?? null,
      meetingLng: firstStop?.geo.lng ?? null,
      stopMonumentIds: t.stopMonumentIds,
      totalDistanceM: t.totalDistanceM,
      totalDurationMinutes: t.totalDurationMinutes,
      isActive: true,
    };
  });

  const sources: SourceCitation[] = raw.sources.map((s) => ({
    id: s.id,
    citation: s.citation,
    url: s.url,
  }));

  return { monuments, walkingTours, sources };
}

/** Pick a subset of monuments by id (stable order). */
export function selectMonuments(corpus: LoadedCorpus, ids: string[]): MonumentRecord[] {
  const byId = new Map(corpus.monuments.map((m) => [m.id, m]));
  return ids.map((id) => {
    const hit = byId.get(id);
    if (!hit) throw new Error(`Monument not in corpus: ${id}`);
    return hit;
  });
}
