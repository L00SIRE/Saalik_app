import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import experienceRouter from './routes/experience';
import chatbotRouter from './routes/chatbot';

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'Saalik imagination service ready' });
});

app.use('/api/experience-plan', experienceRouter);
app.use('/api/chat', chatbotRouter);

app.listen(port, () => {
  console.log(`Saalik backend running on port ${port}`);
});
