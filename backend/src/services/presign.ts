import crypto from 'crypto';

export interface PresignInput {
  method: 'GET' | 'PUT';
  host: string;
  /** Object path starting with '/', e.g. /bucket/uploads/a.jpg. */
  path: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  expiresSeconds: number;
  /** Headers the caller must send unchanged with the request, e.g. content-type. */
  signedHeaders?: Record<string, string>;
  now?: Date;
}

const hmac = (key: crypto.BinaryLike, data: string) => crypto.createHmac('sha256', key).update(data).digest();
const sha256 = (data: string) => crypto.createHash('sha256').update(data).digest('hex');
// SigV4 wants RFC 3986 encoding; encodeURIComponent leaves !'()* unescaped.
const encode = (value: string) =>
  encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);

/**
 * AWS Signature Version 4 presigned URL for an S3-compatible store (Cloudflare R2 uses region
 * "auto"). Written against the algorithm directly so the backend needs no cloud SDK.
 */
export function presignS3Url(input: PresignInput): string {
  const amzDate = (input.now ?? new Date()).toISOString().replace(/[-:]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const scope = `${dateStamp}/${input.region}/s3/aws4_request`;

  const headers: Record<string, string> = { host: input.host };
  for (const [name, value] of Object.entries(input.signedHeaders ?? {})) headers[name.toLowerCase()] = value.trim();
  const headerNames = Object.keys(headers).sort();

  // Already in the alphabetical order the canonical request requires.
  const canonicalQuery = [
    ['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
    ['X-Amz-Credential', `${input.accessKeyId}/${scope}`],
    ['X-Amz-Date', amzDate],
    ['X-Amz-Expires', String(input.expiresSeconds)],
    ['X-Amz-SignedHeaders', headerNames.join(';')],
  ]
    .map(([name, value]) => `${encode(name!)}=${encode(value!)}`)
    .join('&');
  const canonicalUri = input.path.split('/').map(encode).join('/');
  const canonicalRequest = [
    input.method,
    canonicalUri,
    canonicalQuery,
    headerNames.map((name) => `${name}:${headers[name]}\n`).join(''),
    headerNames.join(';'),
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${input.secretAccessKey}`, dateStamp), input.region), 's3'), 'aws4_request');
  const signature = hmac(signingKey, stringToSign).toString('hex');
  return `https://${input.host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}
