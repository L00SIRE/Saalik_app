import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/** Where each provider publishes its signing keys, and which env var holds our client id(s). */
export const OAUTH_PROVIDERS = {
  google: {
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    audienceEnv: 'GOOGLE_OAUTH_CLIENT_ID',
  },
  apple: {
    jwksUrl: 'https://appleid.apple.com/auth/keys',
    issuers: ['https://appleid.apple.com'],
    audienceEnv: 'APPLE_OAUTH_CLIENT_ID',
  },
} as const;

export type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

export const isOAuthProvider = (value: string): value is OAuthProvider => value === 'google' || value === 'apple';

export interface OAuthIdentity {
  email: string;
  name: string | null;
  subject: string;
}

export class OAuthError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

type Jwk = crypto.JsonWebKey & { kid?: string };
export type KeyLoader = (jwksUrl: string) => Promise<Jwk[]>;

// shortcut: fetches the provider's key set on every sign-in; cache it for an hour if sign-in volume grows.
const fetchKeys: KeyLoader = async (jwksUrl) => {
  try {
    const response = await fetch(jwksUrl, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return ((await response.json()) as { keys: Jwk[] }).keys;
  } catch {
    throw new OAuthError('Could not load the sign-in provider keys', 502);
  }
};

/**
 * Checks a Google or Apple ID token: RS256 signature against the provider's published keys,
 * issuer, audience (our client id) and expiry. A token is rejected unless the provider says
 * the email is verified, because the email is what links it to a Saalik account.
 */
export async function verifyIdToken(
  provider: OAuthProvider,
  idToken: string,
  loadKeys: KeyLoader = fetchKeys,
): Promise<OAuthIdentity> {
  const config = OAUTH_PROVIDERS[provider];
  const audiences = (process.env[config.audienceEnv] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  // Without a client id any app's token for this provider would pass, so refuse outright.
  if (audiences.length === 0) throw new OAuthError(`${provider} sign-in is not configured`, 503);

  const decoded = jwt.decode(idToken, { complete: true });
  const kid = decoded?.header.kid;
  const jwk = kid ? (await loadKeys(config.jwksUrl)).find((key) => key.kid === kid) : undefined;
  if (!jwk) throw new OAuthError('Invalid ID token', 401);

  let claims: jwt.JwtPayload;
  try {
    claims = jwt.verify(idToken, crypto.createPublicKey({ key: jwk, format: 'jwk' }), {
      algorithms: ['RS256'],
      issuer: [...config.issuers] as [string, ...string[]],
      audience: audiences as [string, ...string[]],
    }) as jwt.JwtPayload;
  } catch {
    throw new OAuthError('Invalid ID token', 401);
  }

  const emailVerified = claims.email_verified === true || claims.email_verified === 'true';
  if (typeof claims.email !== 'string' || !emailVerified || !claims.sub) {
    throw new OAuthError('The sign-in provider did not return a verified email', 403);
  }
  return { email: claims.email, name: typeof claims.name === 'string' ? claims.name : null, subject: claims.sub };
}
