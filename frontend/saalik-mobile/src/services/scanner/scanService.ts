import type { HeritageRepositories } from '../../context/AppModeContext';
import type { Connectivity } from '../sync/BatchSyncManager';
import { postScanTelemetry, scanMonumentInCloud, type ScanTelemetryEvent } from '../heritageApi';
import { getDeviceId } from '../identity';
import { kvGetJSON, kvSetJSON } from '../storage/kvStore';
import { simulateDemoScan } from '../vector/demoScan';
import { rankByProximity } from '../vector/similarity';
import type { AppMode, CaptureAngle, GeoFix, HeritageMonument, MonumentMatch, ScanResult } from '../../types/heritage';

const TELEMETRY_KEY = 'telemetry.pendingScans';
const MAX_PENDING_TELEMETRY = 500;

export interface ScanRequest {
  mode: AppMode;
  connectivity: Connectivity;
  repositories: HeritageRepositories;
  fix: GeoFix | null;
  photoBase64?: string | null;
  demoTarget?: HeritageMonument | null;
  demoAngle?: CaptureAngle;
}

function gpsOnly(repositories: HeritageRepositories, fix: GeoFix | null, notice: string): ScanResult {
  if (!fix) {
    return { source: 'gps_only', searchRadiusM: null, matches: [], notice: `${notice} Enable location to rank nearby monuments.` };
  }
  return { source: 'gps_only', searchRadiusM: null, matches: rankByProximity(repositories.monuments.getAll(), fix), notice };
}

export async function runScan(request: ScanRequest): Promise<ScanResult> {
  const { mode, connectivity, repositories, fix } = request;
  const monuments = repositories.monuments.getAll();

  if (mode === 'NTB_VIP_DEMO_MODE') {
    if (!request.demoTarget) {
      return { source: 'on_device_demo', searchRadiusM: null, matches: [], notice: 'Choose a demo monument photo to scan.' };
    }
    return simulateDemoScan(request.demoTarget, monuments, {
      angle: request.demoAngle ?? 'ESTABLISHING_FRONT',
      deviceFix: fix,
    });
  }

  if (mode === 'LIVE_CLOUD' && connectivity.isConnected && request.photoBase64) {
    try {
      const response = await scanMonumentInCloud({
        imageBase64: request.photoBase64,
        lat: fix?.lat,
        lng: fix?.lng,
        accuracyM: fix?.accuracyM ?? null,
        headingDeg: fix?.headingDeg ?? null,
      });
      const matches: MonumentMatch[] = response.matches
        .map((m) => {
          const monument = repositories.monuments.getById(m.monumentId);
          return monument
            ? {
                monument,
                score: m.score,
                maxAngleSimilarity: m.maxAngleSimilarity,
                top3MeanSimilarity: m.top3MeanSimilarity,
                bestAngle: m.bestAngle,
                distanceM: m.distanceM,
                confidence: m.confidence,
              }
            : null;
        })
        .filter((m): m is MonumentMatch => m !== null);
      return { source: response.source, searchRadiusM: response.searchRadiusM, matches, notice: response.notice };
    } catch (error) {
      console.warn('[scan] Cloud scan failed, using GPS fallback', error);
      return gpsOnly(repositories, fix, 'The visual model is unreachable right now, so results are ranked by GPS only.');
    }
  }

  return gpsOnly(
    repositories,
    fix,
    mode === 'OFFLINE_FIELD_SYNC'
      ? 'Offline field mode: monuments ranked by GPS proximity and geofence.'
      : 'No connection: monuments ranked by GPS proximity.',
  );
}

export async function recordScanTelemetry(
  mode: AppMode,
  result: ScanResult,
  fix: GeoFix | null,
  connectivity: Connectivity,
  convertedToBooking = false,
): Promise<void> {
  const top = result.matches[0];
  const event: ScanTelemetryEvent = {
    deviceId: await getDeviceId(),
    monumentId: top?.monument.id ?? null,
    zoneId: top?.monument.zoneId ?? null,
    mode,
    source: result.source,
    topScore: top?.score ?? null,
    confidence: top?.confidence ?? null,
    lat: fix?.lat ?? null,
    lng: fix?.lng ?? null,
    convertedToBooking,
    occurredAt: new Date().toISOString(),
  };
  const pending = await kvGetJSON<ScanTelemetryEvent[]>(TELEMETRY_KEY, []);
  pending.push(event);
  const trimmed = pending.slice(-MAX_PENDING_TELEMETRY);
  if (mode === 'NTB_VIP_DEMO_MODE' || !connectivity.isConnected) {
    await kvSetJSON(TELEMETRY_KEY, trimmed);
    return;
  }
  try {
    await postScanTelemetry(trimmed);
    await kvSetJSON(TELEMETRY_KEY, []);
  } catch {
    await kvSetJSON(TELEMETRY_KEY, trimmed);
  }
}
