import 'dotenv/config'; // Must be first
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

// Route imports
import authRouter from './routes/auth';
import toursRouter from './routes/tours';
import bookingsRouter from './routes/bookings';
import guidesRouter from './routes/guides';
import reviewsRouter from './routes/reviews';
import aiRouter from './routes/ai';
import { createHeritageRouter } from './heritage/routes/scan';

const ALLOWED_ORIGINS = (
  process.env.CORS_ORIGINS ??
  'http://localhost:8081,http://localhost:19006,http://localhost:3000,http://localhost:4000'
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const skipLimits = () => process.env.NODE_ENV === 'test';

export function createApp() {
const app = express();

app.use(cors({ origin: ALLOWED_ORIGINS, credentials: true }));
app.use(express.json({ limit: '8mb' }));

app.use(
  '/api/auth/login',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, skip: skipLimits }),
);
app.use(
  '/api/auth/refresh',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, skip: skipLimits }),
);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Saalik Nepal Tour Platform API ready',
    version: '2.0.0',
    ai: process.env.GEMINI_API_KEY ? 'enabled' : 'disabled'
  });
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/tours', toursRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/guides', guidesRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/ai', aiRouter);
app.use('/api/heritage', createHeritageRouter());

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

return app;
}

if (require.main === module) {
  const port = process.env.PORT || 4000;
  createApp().listen(port, () => {
    console.log(`🏔️  Saalik Nepal Tour Platform running on port ${port}`);
    console.log(`   Health: http://localhost:${port}/api/health`);
    console.log(`   Tours:  http://localhost:${port}/api/tours`);
  });
}
