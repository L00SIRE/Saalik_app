import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { craftExperiencePlan } from '../services/imaginationEngine';
import prisma from '../db';

const router = Router();
const JWT_SECRET = (process.env.JWT_SECRET || 'secret') as string;

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

const MOCKED_SAVED_PLANS: any[] = [];

router.post('/', async (req, res) => {
  const parsed = experienceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: 'Invalid payload',
      details: parsed.error.flatten(),
    });
  }

  try {
    const plan = await craftExperiencePlan(parsed.data);

    // Optional: Save if authenticated (Header present)
    const authHeader = req.headers.authorization;
    if (authHeader) {
      // In mock mode, just auto-save to memory if needed, or do nothing.
      // Client usually calls /save explicitly or we verify if client expects auto-save.
      // Current logic was: verify token -> save.
      // Let's just return the plan. The client calls /save manually in the UI usually.
    }

    return res.json(plan);
  } catch (error) {
    console.error('Plan generation failed', error);
    return res.status(500).json({ error: 'Plan generation failed' });
  }
});

// Endpoint to manually save a plan
router.post('/save', async (req, res) => {
  // Mock Auth Check
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const { plan } = req.body; // Expecting { plan: ExperiencePlan }
    if (!plan) return res.status(400).json({ error: 'Missing plan data' });

    const newSavedPlan = {
      id: 'mock-plan-' + Date.now(),
      userId: 'demo-user-id',
      data: JSON.stringify(plan),
      createdAt: new Date(),
    };

    MOCKED_SAVED_PLANS.unshift(newSavedPlan); // Add to beginning

    return res.json({ status: 'saved', id: newSavedPlan.id });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token or save failed' });
  }
});

router.get('/saved', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

  try {
    // Return all mocked plans
    const parsedPlans = MOCKED_SAVED_PLANS.map((p: any) => ({
      ...JSON.parse(p.data),
      id: p.id
    }));

    return res.json(parsedPlans);
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
