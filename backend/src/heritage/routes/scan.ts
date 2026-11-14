import { Router, type Request, type Response } from 'express';
import { loadHeritageCorpus } from '../services/corpusLoader';
import { FieldCaptureService } from '../services/fieldCapture.service';
import { TourBookingService } from '../services/tourBooking.service';
import { hybridGeoVisualScan } from '../services/vectorSearch.service';
import { embedImage, rankVisualIndex } from '../services/clipBridge';
import { SEARCH_RADIUS_M, DEGRADED_SEARCH_RADIUS_M, haversineMeters, isGpsDegraded } from '../services/geo';
import { requireAuth, type AuthedRequest } from '../../middleware/requireAuth';
import type { CaptureAngle, GeoFix, LightingTag } from '../types/heritage';

export interface ScanRouterDeps {
  fieldCaptures?: FieldCaptureService;
  bookings?: TourBookingService;
  corpusPath?: string;
}

/**
 * Heritage scan / search / field-capture / booking routes.
 * Designed to mount alongside the existing Express app under `/api/heritage`
 * without touching the legacy SQLite marketplace routes in `backend/`.
 */
export function createHeritageRouter(deps: ScanRouterDeps = {}): Router {
  const router = Router();
  const corpus = loadHeritageCorpus(deps.corpusPath);
  const fieldCaptures = deps.fieldCaptures ?? new FieldCaptureService();
  const bookings = deps.bookings ?? new TourBookingService();

  router.get('/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      service: 'saalik-hybrid-geo-visual',
      monuments: corpus.monuments.length,
      walkingTours: corpus.walkingTours.length,
    });
  });

  const telemetry: Array<Record<string, unknown>> = [];

  router.get('/sync/monuments', (_req: Request, res: Response) => {
    res.json({
      serverTime: new Date().toISOString(),
      corpusVersion: 'nepal_heritage_seed',
      monuments: corpus.monuments,
      deletedIds: [] as string[],
    });
  });

  router.post('/telemetry/scans', (req: Request, res: Response) => {
    const events = (req.body as { events?: Array<Record<string, unknown>> }).events ?? [];
    telemetry.push(...events);
    res.json({ ok: true, accepted: events.length, stored: telemetry.length });
  });

  router.get('/command-center', (_req: Request, res: Response) => {
    const byZone = new Map<string, number>();
    for (const monument of corpus.monuments) {
      byZone.set(monument.zoneId, (byZone.get(monument.zoneId) ?? 0) + 1);
    }
    res.json({
      source: 'live',
      generatedAt: new Date().toISOString(),
      monumentCount: corpus.monuments.length,
      zoneCount: byZone.size,
      zones: [...byZone.entries()].map(([zoneId, monumentCount]) => ({ zoneId, monumentCount })),
      scanEvents: telemetry.length,
      fieldCaptures: fieldCaptures.size(),
      citations: ['https://www.sumandangal.com/'],
    });
  });

  router.post('/captures/batch', (req: Request, res: Response) => {
    const captures = ((req.body as { captures?: Array<Record<string, unknown>> }).captures ?? []).map((item) => ({
      clientCaptureId: String(item.clientCaptureId),
      monumentCode: item.monumentId ? String(item.monumentId) : null,
      zoneCode: item.zoneId ? String(item.zoneId) : null,
      angle: item.angle as CaptureAngle,
      photoUri: `pending://${String(item.clientCaptureId)}`,
      latitude: (item.latitude as number | null) ?? null,
      longitude: (item.longitude as number | null) ?? null,
      altitudeM: (item.altitudeM as number | null) ?? null,
      gpsAccuracyM: (item.gpsAccuracyM as number | null) ?? null,
      headingDeg: (item.headingDeg as number | null) ?? null,
      lightingTag: (item.lightingTag as LightingTag | undefined) ?? 'OVERCAST',
      notes: (item.notes as string | null) ?? null,
      capturedAt: String(item.capturedAt),
    }));
    const batch = fieldCaptures.batchUpsert(captures);
    res.json({
      results: batch.results.map((r) => ({
        clientCaptureId: r.record.clientCaptureId,
        serverId: r.record.id,
        outcome: r.created ? 'created' : r.updated ? 'updated' : 'unchanged',
        photoReceived: false,
      })),
    });
  });

  router.post('/captures/:id/photo', (req: Request, res: Response) => {
    res.json({ ok: true, clientCaptureId: req.params.id, received: 'photo' });
  });

  router.post('/captures/:id/voice-note', (req: Request, res: Response) => {
    res.json({ ok: true, clientCaptureId: req.params.id, received: 'voice-note' });
  });

  router.post('/scan', (req: Request, res: Response) => {
    const body = req.body as {
      queryEmbedding?: number[] | null;
      lat?: number | null;
      lng?: number | null;
      accuracyM?: number | null;
      topK?: number;
      mode?: string;
    };

    const fix: GeoFix | null =
      body.lat != null && body.lng != null
        ? { lat: body.lat, lng: body.lng, accuracyM: body.accuracyM ?? null }
        : null;

    const result = hybridGeoVisualScan({
      queryEmbedding: body.queryEmbedding ?? null,
      fix,
      monuments: corpus.monuments,
      walkingTours: corpus.walkingTours,
      sourceCatalog: corpus.sources,
      topK: body.topK ?? 3,
      mode: body.mode,
    });

    res.json({
      ...result,
      matches: result.matches.map((match) => ({
        monumentId: match.monument.id,
        monument: match.monument,
        score: match.score,
        maxAngleSimilarity: match.maxAngleSimilarity,
        top3MeanSimilarity: match.top3MeanSimilarity,
        bestAngle: match.bestAngle,
        distanceM: match.distanceM,
        confidence: match.confidence,
      })),
    });
  });

  router.post('/field-captures/batch', (req: Request, res: Response) => {
    const body = req.body as {
      captures?: Array<{
        clientCaptureId: string;
        monumentCode?: string;
        zoneCode?: string;
        userId?: string;
        angle: CaptureAngle;
        photoUri: string;
        voiceNoteUri?: string | null;
        latitude?: number | null;
        longitude?: number | null;
        altitudeM?: number | null;
        gpsAccuracyM?: number | null;
        headingDeg?: number | null;
        lightingTag?: LightingTag;
        notes?: string | null;
        capturedAt: string;
      }>;
    };

    const captures = body.captures ?? [];
    const batch = fieldCaptures.batchUpsert(captures);
    res.json({
      ok: true,
      created: batch.created,
      duplicates: batch.duplicates,
      updated: batch.updated,
      totalStored: fieldCaptures.size(),
      results: batch.results.map((r) => ({
        clientCaptureId: r.record.clientCaptureId,
        id: r.record.id,
        status: r.record.status,
        created: r.created,
        updated: r.updated,
        duplicate: r.duplicate,
      })),
    });
  });

  router.post('/bookings', (req: Request, res: Response) => {
    const body = req.body as {
      walkingTourId: string;
      userId: string;
      bookingDate: string;
      partySize?: number;
      notes?: string;
      autoAccept?: boolean;
    };
    const booking = bookings.create(body);
    res.status(201).json(booking);
  });

  router.get('/session', requireAuth, (req: AuthedRequest, res: Response) => {
    res.json({ ok: true, userId: req.userId });
  });

  router.post('/scan-image', async (req: Request, res: Response) => {
    const body = req.body as {
      imageBase64?: string;
      lat?: number | null;
      lng?: number | null;
      accuracyM?: number | null;
      topK?: number;
      mode?: string;
    };
    if (!body.imageBase64) {
      res.status(400).json({ error: 'imageBase64 is required' });
      return;
    }
    const embedded = await embedImage(body.imageBase64);
    const fix: GeoFix | null =
      body.lat != null && body.lng != null
        ? { lat: body.lat, lng: body.lng, accuracyM: body.accuracyM ?? null }
        : null;
    const geoRadius = fix ? (isGpsDegraded(fix) ? DEGRADED_SEARCH_RADIUS_M : SEARCH_RADIUS_M) : null;
    let visualHits = rankVisualIndex(embedded.vector, 30);
    if (fix && geoRadius != null) {
      const nearby = visualHits.filter((hit) => {
        const monument = corpus.monuments.find((item) => item.id === hit.monumentId);
        if (!monument) return false;
        return haversineMeters(fix, monument.geo) <= geoRadius;
      });
      if (nearby.length > 0) visualHits = nearby;
    }
    visualHits = visualHits.slice(0, body.topK ?? 3);
    const ranked = hybridGeoVisualScan({
      queryEmbedding: null,
      fix,
      monuments: corpus.monuments,
      walkingTours: corpus.walkingTours,
      sourceCatalog: corpus.sources,
      topK: body.topK ?? 3,
      mode: body.mode,
    });
    const byId = new Map(corpus.monuments.map((monument) => [monument.id, monument]));
    telemetry.push({
      at: new Date().toISOString(),
      source: embedded.source,
      topMonumentId: visualHits[0]?.monumentId ?? null,
      topScore: visualHits[0]?.score ?? null,
      lat: body.lat ?? null,
      lng: body.lng ?? null,
    });
    res.json({
      source: embedded.source === 'clip_worker' ? 'cloud_visual' : 'gps_only',
      embeddingSource: embedded.source,
      quality: embedded.quality,
      elapsedMs: embedded.elapsedMs,
      searchRadiusM: geoRadius ?? ranked.searchRadiusM,
      notice: embedded.source === 'clip_worker' ? null : 'CLIP worker offline; used a deterministic visual cue.',
      matches: visualHits.map((hit) => ({
        monumentId: hit.monumentId,
        score: hit.score,
        maxAngleSimilarity: hit.score,
        top3MeanSimilarity: hit.score,
        bestAngle: 'ESTABLISHING_FRONT',
        distanceM: fix ? haversineMeters(fix, (byId.get(hit.monumentId) ?? { geo: fix }).geo) : null,
        confidence: hit.score >= 0.82 ? 'HIGH' : hit.score >= 0.65 ? 'MEDIUM' : 'LOW',
        monument: byId.get(hit.monumentId) ?? null,
      })),
    });
  });

  router.post('/bookings/:id/transition', (req: Request, res: Response) => {
    const body = req.body as { to: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'; reason?: string; actorId?: string };
    try {
      const updated = bookings.transition(req.params.id as string, body.to, {
        reason: body.reason,
        actorId: body.actorId,
      });
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : 'transition_failed' });
    }
  });

  return router;
}
