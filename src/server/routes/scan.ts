import { Router, type Request, type Response } from 'express';
import { loadHeritageCorpus } from '../services/corpusLoader';
import { FieldCaptureService } from '../services/fieldCapture.service';
import { TourBookingService } from '../services/tourBooking.service';
import { hybridGeoVisualScan } from '../services/vectorSearch.service';
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

    res.json(result);
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
