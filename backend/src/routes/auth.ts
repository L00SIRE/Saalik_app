import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../db';
import { ACCESS_EXPIRY, ACCESS_SECRET, REFRESH_EXPIRY_DAYS, REFRESH_SECRET } from '../config/auth';
import { isOAuthProvider, OAuthError, verifyIdToken } from '../services/oauth';

const router = Router();

// ─── Validation Schemas ────────────────────────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Token Helpers ────────────────────────────────────────────────────────────

function signAccessToken(userId: string): string {
  return jwt.sign({ userId }, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRY });
}

async function issueRefreshToken(userId: string): Promise<string> {
  const tokenId = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_EXPIRY_DAYS);

  await prisma.refreshToken.create({ data: { id: tokenId, userId, expiresAt } });

  return jwt.sign({ userId, tokenId }, REFRESH_SECRET, {
    expiresIn: `${REFRESH_EXPIRY_DAYS}d`,
  });
}

type DbUser = {
  id: string; email: string; name: string;
  phone: string | null; avatar: string | null; role: string;
};

function formatUser(u: DbUser) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    ...(u.phone && { phone: u.phone }),
    ...(u.avatar && { avatar: u.avatar }),
    role: u.role as 'TRAVELER' | 'GUIDE' | 'ADMIN',
  };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' });
  }

  const { email, password, name } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: 'Email already registered' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, passwordHash, name, role: 'TRAVELER' },
  });

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id),
    issueRefreshToken(user.id),
  ]);

  return res.status(201).json({ user: formatUser(user), accessToken, refreshToken });
});

router.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  // Constant-time comparison to prevent user enumeration
  const hash = user?.passwordHash ?? '$2b$12$invalidhashtopreventtiming000000000';
  const valid = await bcrypt.compare(password, hash);

  if (!user || !valid) return res.status(401).json({ error: 'Invalid credentials' });

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id),
    issueRefreshToken(user.id),
  ]);

  return res.json({ user: formatUser(user), accessToken, refreshToken });
});

/**
 * POST /api/auth/oauth/:provider   (provider: google | apple)
 * Body: { idToken, name? }. Verifies the provider's ID token, finds or creates the user by
 * verified email, and returns the same { user, accessToken, refreshToken } as /login.
 */
router.post('/oauth/:provider', async (req, res) => {
  const provider = String(req.params.provider);
  if (!isOAuthProvider(provider)) return res.status(404).json({ error: 'Unknown sign-in provider' });

  const { idToken, name } = req.body as { idToken?: unknown; name?: unknown };
  if (typeof idToken !== 'string' || !idToken) return res.status(400).json({ error: 'idToken is required' });

  let identity;
  try {
    identity = await verifyIdToken(provider, idToken);
  } catch (error) {
    if (error instanceof OAuthError) return res.status(error.status).json({ error: error.message });
    throw error;
  }

  let user = await prisma.user.findUnique({ where: { email: identity.email } });
  if (!user) {
    // Apple only sends the name to the app, and only on first sign-in, so the body may carry it.
    const fallbackName = typeof name === 'string' && name.trim() ? name.trim() : identity.email.split('@')[0]!;
    user = await prisma.user.create({
      data: {
        email: identity.email,
        // No password exists for a social account; a random one means password login can never match.
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
        name: (identity.name ?? fallbackName).slice(0, 100),
        role: 'TRAVELER',
      },
    });
  }

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(user.id),
    issueRefreshToken(user.id),
  ]);

  return res.json({ user: formatUser(user), accessToken, refreshToken });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

  let payload: { userId: string; tokenId: string };
  try {
    payload = jwt.verify(refreshToken, REFRESH_SECRET) as typeof payload;
  } catch {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { id: payload.tokenId },
    include: { user: true },
  });

  // Replay-attack detection: token not found after valid JWT signature
  // means it was already rotated — invalidate ALL tokens for this user
  if (!stored) {
    await prisma.refreshToken.deleteMany({ where: { userId: payload.userId } });
    return res.status(401).json({ error: 'Refresh token already used' });
  }

  if (stored.expiresAt < new Date()) {
    await prisma.refreshToken.delete({ where: { id: stored.id } });
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  // Atomic rotation: delete old, issue new
  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const [newAccess, newRefresh] = await Promise.all([
    signAccessToken(stored.userId),
    issueRefreshToken(stored.userId),
  ]);

  return res.json({ accessToken: newAccess, refreshToken: newRefresh });
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };

  if (refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, REFRESH_SECRET) as { tokenId: string };
      await prisma.refreshToken.delete({ where: { id: payload.tokenId } }).catch(() => {});
    } catch {
      // Already expired / invalid — no-op
    }
  }

  return res.json({ message: 'Logged out' });
});

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const token = authHeader.slice(7);
    const { userId } = jwt.verify(token, ACCESS_SECRET) as { userId: string };
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(401).json({ error: 'User not found' });
    return res.json(formatUser(user));
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
