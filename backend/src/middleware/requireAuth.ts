import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { ACCESS_SECRET } from '../config/auth';

export interface AuthedRequest extends Request {
  userId?: string;
  user?: { userId: string };
}

export function userIdFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const payload = jwt.verify(authHeader.slice('Bearer '.length), ACCESS_SECRET) as { userId?: string };
    return payload.userId ?? null;
  } catch {
    return null;
  }
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const userId = userIdFromHeader(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  req.userId = userId;
  req.user = { userId };
  next();
}
