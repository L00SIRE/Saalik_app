import { Router, type Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth';
import { presignS3Url } from '../services/presign';

const router = Router();

const EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' } as const;
const EXPIRES_SECONDS = 600;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const presignSchema = z.object({
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  contentLength: z.number().int().positive().max(MAX_UPLOAD_BYTES),
});

/**
 * POST /api/uploads/presign
 * Returns a short-lived URL the app can PUT one image to, straight into Cloudflare R2.
 * The content type and byte length are part of the signature, so the upload must send the same
 * headers: a URL signed for a 2 MB JPEG cannot be used to store anything larger or of another type.
 */
router.post('/presign', requireAuth, (req: AuthedRequest, res: Response) => {
  const parsed = presignSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'contentType must be image/jpeg, image/png or image/webp, and contentLength a byte count up to 10 MB',
    });
  }

  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    return res.status(503).json({ error: 'Object storage is not configured' });
  }

  const { contentType, contentLength } = parsed.data;
  const key = `uploads/${req.userId}/${crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
  const uploadUrl = presignS3Url({
    method: 'PUT',
    host: `${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    path: `/${R2_BUCKET}/${key}`,
    region: 'auto',
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    expiresSeconds: EXPIRES_SECONDS,
    signedHeaders: { 'content-type': contentType, 'content-length': String(contentLength) },
  });

  return res.json({
    uploadUrl,
    method: 'PUT',
    headers: { 'Content-Type': contentType, 'Content-Length': String(contentLength) },
    key,
    expiresInSeconds: EXPIRES_SECONDS,
  });
});

export default router;
