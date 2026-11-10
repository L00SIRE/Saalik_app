import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import type { CaptureAngle, FieldCapture, HeritageMonument, LightingTag, MatchConfidence } from '../types/heritage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

const client = axios.create({ baseURL: `${API_BASE_URL}/heritage`, timeout: 20000 });

async function authHeader(): Promise<Record<string, string>> {
  try {
    const token = await SecureStore.getItemAsync('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

client.interceptors.request.use(async (config) => {
  Object.assign(config.headers, await authHeader());
  return config;
});

// ============================================
// DELTA SYNC
// ============================================

export interface MonumentDeltaResponse {
  serverTime: string;
  corpusVersion: string;
  monuments: HeritageMonument[];
  deletedIds: string[];
}

export async function fetchMonumentDelta(since: string | null): Promise<MonumentDeltaResponse> {
  const { data } = await client.get<MonumentDeltaResponse>('/sync/monuments', { params: since ? { since } : {} });
  return data;
}

// ============================================
// SCANNING
// ============================================

export interface CloudScanRequest {
  imageBase64?: string;
  queryEmbedding?: number[];
  lat?: number;
  lng?: number;
  accuracyM?: number | null;
  headingDeg?: number | null;
  topK?: number;
}

export interface CloudScanMatch {
  monumentId: string;
  score: number;
  maxAngleSimilarity: number;
  top3MeanSimilarity: number;
  bestAngle: CaptureAngle | null;
  distanceM: number | null;
  confidence: MatchConfidence;
}

export interface CloudScanResponse {
  source: 'cloud_visual' | 'gps_only';
  searchRadiusM: number | null;
  matches: CloudScanMatch[];
  notice: string | null;
}

export async function scanMonumentInCloud(request: CloudScanRequest): Promise<CloudScanResponse> {
  const { data } = await client.post<CloudScanResponse>('/scan', request, { timeout: 30000 });
  return data;
}

export interface ScanTelemetryEvent {
  deviceId: string;
  monumentId: string | null;
  zoneId: string | null;
  mode: string;
  source: string;
  topScore: number | null;
  confidence: MatchConfidence | null;
  lat: number | null;
  lng: number | null;
  convertedToBooking: boolean;
  occurredAt: string;
}

export async function postScanTelemetry(events: ScanTelemetryEvent[]): Promise<void> {
  if (events.length === 0) return;
  await client.post('/telemetry/scans', { events });
}

// ============================================
// FIELD CAPTURE UPLOADS
// ============================================

export interface CaptureMetadata {
  clientCaptureId: string;
  monumentId: string;
  zoneId: string;
  angle: CaptureAngle;
  latitude: number | null;
  longitude: number | null;
  altitudeM: number | null;
  gpsAccuracyM: number | null;
  headingDeg: number | null;
  lightingTag: LightingTag;
  notes: string | null;
  hasVoiceNote: boolean;
  capturedAt: string;
}

export interface CaptureBatchResult {
  clientCaptureId: string;
  serverId: string;
  outcome: 'created' | 'updated' | 'unchanged';
  photoReceived: boolean;
}

export function toCaptureMetadata(capture: FieldCapture): CaptureMetadata {
  return {
    clientCaptureId: capture.clientCaptureId,
    monumentId: capture.monumentId,
    zoneId: capture.zoneId,
    angle: capture.angle,
    latitude: capture.latitude,
    longitude: capture.longitude,
    altitudeM: capture.altitudeM,
    gpsAccuracyM: capture.gpsAccuracyM,
    headingDeg: capture.headingDeg,
    lightingTag: capture.lightingTag,
    notes: capture.notes,
    hasVoiceNote: capture.voiceNoteUri !== null,
    capturedAt: capture.capturedAt,
  };
}

export async function upsertCaptureBatch(deviceId: string, captures: CaptureMetadata[]): Promise<CaptureBatchResult[]> {
  const { data } = await client.post<{ results: CaptureBatchResult[] }>('/captures/batch', { deviceId, captures });
  return data.results;
}

async function uploadFile(path: string, fileUri: string, fieldName: string, mimeType: string): Promise<void> {
  const result = await FileSystem.uploadAsync(`${API_BASE_URL}/heritage${path}`, fileUri, {
    httpMethod: 'POST',
    uploadType: FileSystem.FileSystemUploadType.MULTIPART,
    fieldName,
    mimeType,
    headers: await authHeader(),
  });
  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Upload failed with HTTP ${result.status}: ${result.body.slice(0, 200)}`);
  }
}

export function uploadCapturePhoto(clientCaptureId: string, photoUri: string): Promise<void> {
  return uploadFile(`/captures/${encodeURIComponent(clientCaptureId)}/photo`, photoUri, 'photo', 'image/jpeg');
}

export function uploadCaptureVoiceNote(clientCaptureId: string, voiceNoteUri: string): Promise<void> {
  return uploadFile(`/captures/${encodeURIComponent(clientCaptureId)}/voice-note`, voiceNoteUri, 'voiceNote', 'audio/m4a');
}
