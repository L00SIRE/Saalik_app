import { existsSync, readdirSync, readFileSync } from "fs";
import path from "path";
import type { CaptureAngle, TwinArchetype, TwinData, TwinMonument, TwinZone } from "./types";

export const GEOFENCE_RADIUS_M = 150;

const ZONES_DIR = path.join("data", "nepal_heritage_seed", "zones");
const VISUAL_INDEX = path.join("frontend", "saalik-mobile", "src", "data", "visualIndex.json");

/** Every `monumentType` in the corpus, mapped to the shape family the scene can draw. */
export const ARCHETYPE_BY_TYPE: Record<string, TwinArchetype> = {
  PAGODA_TEMPLE: "PAGODA",
  SHIKHARA_TEMPLE: "SHIKHARA",
  STUPA: "STUPA",
  CHAITYA: "STUPA",
  DOME_TEMPLE: "DOME",
  PALACE: "PALACE",
  PALACE_COURTYARD: "COURTYARD",
  MUSEUM_COURTYARD: "COURTYARD",
  MONASTERY: "COURTYARD",
  RESIDENCE: "COURTYARD",
  PILGRIM_COMPLEX: "COURTYARD",
  LIVING_CRAFT_SQUARE: "COURTYARD",
  BELL: "BELL",
  PILLAR_STATUE: "PILLAR",
  ROYAL_STATUE: "PILLAR",
  MONUMENTAL_STATUE: "PILLAR",
  SHRINE: "SHRINE",
  MASK_SHRINE: "SHRINE",
  STONE_IMAGE: "SHRINE",
  STONE_RELIEF: "SHRINE",
  INSCRIPTION: "SHRINE",
  POND: "WATER",
  WATER_SPOUT: "WATER",
  CREMATION_GHAT: "GHAT",
  GATEWAY: "GATEWAY",
  REST_HOUSE: "PAVILION",
  ARCADE: "PAVILION",
  VIEWPOINT: "MARKER",
  HERITAGE_TRAIL: "MARKER",
};

interface RawMonument {
  id: string;
  names: { en: string; ne: string };
  monumentType: string;
  geo: { lat: number; lng: number; geofenceRadiusM: number };
  visualCues: {
    roofTiers?: number;
    primaryMaterials?: string[];
    guardianVahanas?: string[];
    distinguishingFeatures?: string[];
    disambiguationTip?: string;
  };
  fieldPhotoSpec: {
    bestTimeOfDay: string;
    localTimeWindow: string;
    lightingNotes: string;
    angles: { angle: CaptureAngle; framingNote: string }[];
  };
  walkingTourStop?: { sequence?: number };
}

interface RawZone {
  zoneId: string;
  names: { en: string; ne: string };
  designation: string;
  centroid: { lat: number; lng: number };
  monuments: RawMonument[];
}

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

/**
 * Nominal height and footprint in metres. The corpus has no surveyed dimensions, so these come
 * from the monument type, its roof tiers and its geofence radius (a rough size hint).
 */
export function nominalSize(type: string, roofTiers: number, geofenceRadiusM: number): { heightM: number; footprintM: number } {
  const scale = clamp(geofenceRadiusM / 30, 0.75, 1.5);
  switch (type) {
    case "PAGODA_TEMPLE": {
      const tiers = Math.max(1, roofTiers);
      return { heightM: 6 + 5 * tiers, footprintM: (7 + 1.5 * tiers) * scale };
    }
    case "REST_HOUSE":
      return { heightM: 6 + 4 * Math.max(1, roofTiers), footprintM: 18 };
    case "SHIKHARA_TEMPLE":
      return { heightM: 17 * scale, footprintM: 8 * scale };
    case "STUPA":
      return { heightM: geofenceRadiusM * 0.46, footprintM: geofenceRadiusM * 1.1 };
    case "CHAITYA":
      return { heightM: 3, footprintM: 2.5 };
    case "DOME_TEMPLE":
      return { heightM: 14 * scale, footprintM: 10 * scale };
    case "PALACE":
      return { heightM: 14, footprintM: clamp(geofenceRadiusM * 0.9, 25, 90) };
    case "PALACE_COURTYARD":
    case "MUSEUM_COURTYARD":
    case "MONASTERY":
    case "RESIDENCE":
    case "PILGRIM_COMPLEX":
    case "LIVING_CRAFT_SQUARE":
      return { heightM: 9 + 3 * roofTiers, footprintM: clamp(geofenceRadiusM * 0.9, 16, 45) };
    case "BELL":
      return { heightM: 5, footprintM: 4 };
    case "MONUMENTAL_STATUE":
      return { heightM: 20, footprintM: 12 };
    case "PILLAR_STATUE":
    case "ROYAL_STATUE":
      return { heightM: 9, footprintM: 2.5 };
    case "SHRINE":
    case "MASK_SHRINE":
      return { heightM: 4.5 * scale, footprintM: 4 * scale };
    case "STONE_IMAGE":
    case "STONE_RELIEF":
    case "INSCRIPTION":
      return { heightM: 2.5, footprintM: 2.5 };
    case "POND":
      return { heightM: 1, footprintM: clamp(geofenceRadiusM * 1.2, 15, 120) };
    case "WATER_SPOUT":
      return { heightM: 2, footprintM: 12 };
    case "CREMATION_GHAT":
      return { heightM: 3, footprintM: geofenceRadiusM };
    case "GATEWAY":
      return { heightM: 8, footprintM: 7 };
    case "ARCADE":
      return { heightM: 3, footprintM: geofenceRadiusM };
    case "VIEWPOINT":
      return { heightM: 2, footprintM: 6 };
    default:
      return { heightM: 2.5, footprintM: 4 };
  }
}

function cosine(a: number[] | undefined, b: number[] | undefined): number | null {
  if (!a || !b || a.length === 0 || a.length !== b.length) return null;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    normA += x * x;
    normB += y * y;
  }
  return normA === 0 || normB === 0 ? null : dot / Math.sqrt(normA * normB);
}

function findRepoRoot(startDir: string): string {
  let dir = path.resolve(startDir);
  for (let depth = 0; depth < 5; depth += 1) {
    if (existsSync(path.join(dir, ZONES_DIR))) return dir;
    dir = path.dirname(dir);
  }
  throw new Error(`Heritage seed not found above ${startDir} (expected ${ZONES_DIR})`);
}

// shortcut: reads the seed and vector index from the monorepo at build/request time;
// compile them into this app's src/data if it is ever deployed outside the repo.
export function loadTwinData(startDir: string = process.cwd()): TwinData {
  const root = findRepoRoot(startDir);
  const zonesDir = path.join(root, ZONES_DIR);

  let vectors: Record<string, Record<string, number[]>> = {};
  let vectorModel: string | null = null;
  const indexPath = path.join(root, VISUAL_INDEX);
  if (existsSync(indexPath)) {
    const index = JSON.parse(readFileSync(indexPath, "utf8")) as {
      model?: string;
      monuments?: Record<string, Record<string, number[]>>;
    };
    vectors = index.monuments ?? {};
    vectorModel = index.model ?? null;
  }
  const prototype = (id: string): number[] | undefined =>
    vectors[id]?.ESTABLISHING_FRONT ?? Object.values(vectors[id] ?? {})[0];

  const zones: TwinZone[] = readdirSync(zonesDir)
    .filter((file) => file.endsWith(".json"))
    .sort()
    .map((file) => {
      const raw = JSON.parse(readFileSync(path.join(zonesDir, file), "utf8")) as RawZone;
      const metresPerDegLng = 111_320 * Math.cos((raw.centroid.lat * Math.PI) / 180);

      const monuments: TwinMonument[] = raw.monuments.map((item) => {
        const x = (item.geo.lng - raw.centroid.lng) * metresPerDegLng;
        const z = -(item.geo.lat - raw.centroid.lat) * 110_540;
        const roofTiers = item.visualCues.roofTiers ?? 0;
        // Facade bearing is not in the corpus: assume it faces the plaza centre (the zone centroid).
        const facingDeg = Math.hypot(x, z) < 5 ? 180 : ((Math.atan2(-x, z) * 180) / Math.PI + 360) % 360;
        return {
          id: item.id,
          nameEn: item.names.en,
          nameNe: item.names.ne,
          monumentType: item.monumentType,
          archetype: ARCHETYPE_BY_TYPE[item.monumentType] ?? "MARKER",
          lat: item.geo.lat,
          lng: item.geo.lng,
          x,
          z,
          geofenceRadiusM: item.geo.geofenceRadiusM,
          roofTiers,
          materials: item.visualCues.primaryMaterials ?? [],
          guardians: item.visualCues.guardianVahanas ?? [],
          features: item.visualCues.distinguishingFeatures ?? [],
          disambiguationTip: item.visualCues.disambiguationTip ?? "",
          facingDeg,
          ...nominalSize(item.monumentType, roofTiers, item.geo.geofenceRadiusM),
          bestTimeOfDay: item.fieldPhotoSpec.bestTimeOfDay,
          localTimeWindow: item.fieldPhotoSpec.localTimeWindow,
          lightingNotes: item.fieldPhotoSpec.lightingNotes,
          captureAngles: item.fieldPhotoSpec.angles.map(({ angle, framingNote }) => ({ angle, framingNote })),
          tourSequence: item.walkingTourStop?.sequence ?? 999,
          neighbors: [],
        };
      });

      for (const monument of monuments) {
        monument.neighbors = monuments
          .filter((other) => other.id !== monument.id)
          .map((other) => ({
            id: other.id,
            nameEn: other.nameEn,
            distanceM: Math.hypot(other.x - monument.x, other.z - monument.z),
            cosine: cosine(prototype(monument.id), prototype(other.id)),
          }))
          .filter((neighbor) => neighbor.distanceM <= GEOFENCE_RADIUS_M)
          .sort((a, b) => a.distanceM - b.distanceM);
      }

      return {
        zoneId: raw.zoneId,
        nameEn: raw.names.en,
        nameNe: raw.names.ne,
        designation: raw.designation,
        centroid: raw.centroid,
        monuments,
      };
    });

  return { zones, geofenceRadiusM: GEOFENCE_RADIUS_M, vectorModel };
}
