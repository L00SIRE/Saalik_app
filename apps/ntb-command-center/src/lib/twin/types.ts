/** Shared contract between the twin data loader, the solar model and the three.js scene. */

/** Shape family the procedural builder draws for a corpus `monumentType`. */
export type TwinArchetype =
  | "PAGODA"
  | "SHIKHARA"
  | "STUPA"
  | "DOME"
  | "COURTYARD"
  | "PALACE"
  | "BELL"
  | "PILLAR"
  | "SHRINE"
  | "WATER"
  | "GHAT"
  | "GATEWAY"
  | "PAVILION"
  | "MARKER";

export type CaptureAngle =
  | "ESTABLISHING_FRONT"
  | "LEFT_45"
  | "RIGHT_45"
  | "CLOSE_UP_ICONOGRAPHY"
  | "WIDE_COURTYARD_CONTEXT";

export const CAPTURE_ANGLES: CaptureAngle[] = [
  "ESTABLISHING_FRONT",
  "LEFT_45",
  "RIGHT_45",
  "CLOSE_UP_ICONOGRAPHY",
  "WIDE_COURTYARD_CONTEXT",
];

export interface TwinCaptureAngle {
  angle: CaptureAngle;
  framingNote: string;
}

export interface TwinNeighbor {
  id: string;
  nameEn: string;
  distanceM: number;
  /** Cosine similarity of the two monuments' CLIP prototype vectors; null when either has no vector. */
  cosine: number | null;
}

export interface TwinMonument {
  id: string;
  nameEn: string;
  nameNe: string;
  /** Raw corpus value, e.g. PAGODA_TEMPLE. */
  monumentType: string;
  archetype: TwinArchetype;
  lat: number;
  lng: number;
  /** Local metres from the zone centroid: +x is east, +z is south (three.js; north is -z). */
  x: number;
  z: number;
  geofenceRadiusM: number;
  roofTiers: number;
  materials: string[];
  guardians: string[];
  features: string[];
  disambiguationTip: string;
  /** Compass bearing (0 = north, 90 = east) the main facade is assumed to face. Heuristic, not surveyed. */
  facingDeg: number;
  /** Nominal overall height and footprint width in metres, used for shadows and camera placement. */
  heightM: number;
  footprintM: number;
  bestTimeOfDay: string;
  localTimeWindow: string;
  lightingNotes: string;
  captureAngles: TwinCaptureAngle[];
  tourSequence: number;
  /** Other monuments within the geofence radius, nearest first. */
  neighbors: TwinNeighbor[];
}

export interface TwinZone {
  zoneId: string;
  nameEn: string;
  nameNe: string;
  designation: string;
  centroid: { lat: number; lng: number };
  monuments: TwinMonument[];
}

export interface TwinData {
  zones: TwinZone[];
  /** Candidate radius used by the retrieval stage, in metres. */
  geofenceRadiusM: number;
  /** Model id of the prototype vectors behind `TwinNeighbor.cosine`, or null when no index was found. */
  vectorModel: string | null;
}

/** Azimuth is a compass bearing (0 = north, clockwise); elevation is degrees above the horizon. */
export interface SunPosition {
  azimuthDeg: number;
  elevationDeg: number;
}
