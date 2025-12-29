import 'dotenv/config'; // Must be first
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth';
import experienceRouter from './routes/experience';
import chatbotRouter from './routes/chatbot';

// dotenv.config() removed as it is loaded above

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Saalik imagination service ready' });
});

app.use('/api/auth', authRouter);
app.use('/api/experience-plan', experienceRouter);
app.use('/api/chat', chatbotRouter);

app.listen(port, () => {
  console.log(`Saalik backend running on port ${port}`);
});
