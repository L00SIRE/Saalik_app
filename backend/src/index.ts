import 'dotenv/config'; // Must be first
import express from 'express';
import cors from 'cors';

// Route imports
import authRouter from './routes/auth';
import toursRouter from './routes/tours';
import bookingsRouter from './routes/bookings';
import guidesRouter from './routes/guides';
import reviewsRouter from './routes/reviews';
import aiRouter from './routes/ai';

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

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

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`🏔️  Saalik Nepal Tour Platform running on port ${port}`);
  console.log(`   Health: http://localhost:${port}/api/health`);
  console.log(`   Tours:  http://localhost:${port}/api/tours`);
});
