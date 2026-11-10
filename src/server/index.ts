import express from 'express';
import { createHeritageRouter } from './routes/scan';
import { FieldCaptureService } from './services/fieldCapture.service';
import { TourBookingService } from './services/tourBooking.service';

/**
 * Standalone Hybrid Geo-Visual API entrypoint.
 * Additive to `backend/` — mount createHeritageRouter() there if desired:
 *   app.use('/api/heritage', createHeritageRouter());
 */
export function createHeritageApp(): express.Application {
  const app = express();
  app.use(express.json({ limit: '4mb' }));

  const fieldCaptures = new FieldCaptureService();
  const bookings = new TourBookingService();

  app.get('/', (_req, res) => {
    res.json({
      name: 'Saalik Hybrid Geo-Visual API',
      version: '1.0.0',
      endpoints: [
        'GET /api/heritage/health',
        'POST /api/heritage/scan',
        'POST /api/heritage/field-captures/batch',
        'POST /api/heritage/bookings',
        'POST /api/heritage/bookings/:id/transition',
      ],
    });
  });

  app.use('/api/heritage', createHeritageRouter({ fieldCaptures, bookings }));
  return app;
}

export { createHeritageRouter } from './routes/scan';
export * from './services/vectorSearch.service';
export { FieldCaptureService } from './services/fieldCapture.service';
export { TourBookingService, canTransition, assertTransition } from './services/tourBooking.service';
export {
  BookingStateMachine,
  createPendingBooking,
} from './services/bookingState.service';
export { loadHeritageCorpus, selectMonuments } from './services/corpusLoader';

const isDirectRun = typeof require !== 'undefined' && require.main === module;

if (isDirectRun) {
  const port = Number(process.env.PORT ?? 4100);
  const app = createHeritageApp();
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`Saalik Hybrid Geo-Visual API listening on :${port}`);
  });
}
