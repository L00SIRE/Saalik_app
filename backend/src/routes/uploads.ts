import { Router, type Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth';
import { presignS3Url } from '../services/presign';

const router = Router();

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
const EXPIRES_SECONDS = 600;

const presignSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
});

/**
 * POST /api/uploads/presign
 * Returns a short-lived URL the app can PUT one image to, straight into Cloudflare R2.
 * The content type is part of the signature, so the upload must send the same header.
 */
router.post('/presign', requireAuth, (req: AuthedRequest, res: Response) => {
  const parsed = presignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'contentType must be image/jpeg, image/png or image/webp' });
  }

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    return res.status(503).json({ error: 'Object storage is not configured' });
  }

  const { contentType } = parsed.data;
  const key = `uploads/${req.userId}/${crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
  const uploadUrl = presignS3Url({
    method: 'PUT',
    host: `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    path: `/${R2_BUCKET}/${key}`,
    region: 'auto',
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    expiresSeconds: EXPIRES_SECONDS,
    signedHeaders: { 'content-type': contentType },
  });

  return res.json({
    uploadUrl,
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    key,
    expiresInSeconds: EXPIRES_SECONDS,
  });
});

export default router;
