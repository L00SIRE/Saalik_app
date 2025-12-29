import { Router } from 'express';
import { z } from 'zod';
import { respondAsGuide } from '../services/imaginationEngine';
import { ChatTurn } from '../types/experience';

const router = Router();

const chatSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'guide']),
    message: z.string(),
  })).default([]),
  message: z.string().min(2),
});

router.post('/', async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: parsed.error.flatten(),
    });
  }

  const history: ChatTurn[] = [...parsed.data.history, { role: 'user', message: parsed.data.message }];
  const reply = await respondAsGuide(history);

  return res.json({
    history: [...history, reply],
    reply,
  });
});

export default router;
