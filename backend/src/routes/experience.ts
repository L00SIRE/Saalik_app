import { Router } from 'express';
import { z } from 'zod';
import { craftExperiencePlan } from '../services/imaginationEngine';

const router = Router();

const experienceSchema = z.object({
  name: z.string().optional(),
  intent: z.string().min(3),
  mood: z.array(z.string()).optional(),
  partySize: z.number().int().positive().optional(),
  travelMonth: z.string().optional(),
  pace: z.enum(['slow', 'balanced', 'fast']).optional(),
  mustSee: z.array(z.string()).optional(),
  avoid: z.array(z.string()).optional(),
});

router.post('/', (req, res) => {
  const parsed = experienceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: parsed.error.flatten(),
    });
  }

  const plan = craftExperiencePlan(parsed.data);
  return res.json(plan);
});

export default router;
