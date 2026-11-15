import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { verifyIdToken, type KeyLoader } from '../src/services/oauth';

const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const keys: KeyLoader = async () => [{ ...publicKey.export({ format: 'jwk' }), kid: 'test-key' }];

function idToken(claims: Record<string, unknown>, signingKey: crypto.KeyObject = privateKey): string {
  return jwt.sign(
    { sub: 'google-user-1', email: 'aanya@example.com', email_verified: true, name: 'Aanya', ...claims },
    signingKey,
    { algorithm: 'RS256', keyid: 'test-key', expiresIn: '5m', issuer: 'https://accounts.google.com', audience: 'saalik-client' },
  );
}

describe('provider ID token verification', () => {
  beforeEach(() => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'saalik-client';
  });

  it('accepts a token signed by the provider for our client id', async () => {
    await expect(verifyIdToken('google', idToken({}), keys)).resolves.toEqual({
      email: 'aanya@example.com',
      name: 'Aanya',
      subject: 'google-user-1',
    });
  });

  it('refuses every token when no client id is configured', async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    await expect(verifyIdToken('google', idToken({}), keys)).rejects.toMatchObject({ status: 503 });
  });

  it('rejects a token issued to another app', async () => {
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'someone-else';
    await expect(verifyIdToken('google', idToken({}), keys)).rejects.toMatchObject({ status: 401 });
  });

  it('rejects a token signed with a different key', async () => {
    const forged = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
    await expect(verifyIdToken('google', idToken({}, forged), keys)).rejects.toMatchObject({ status: 401 });
  });

  it('rejects a token from the wrong issuer', async () => {
    process.env.APPLE_OAUTH_CLIENT_ID = 'saalik-client';
    await expect(verifyIdToken('apple', idToken({}), keys)).rejects.toMatchObject({ status: 401 });
    delete process.env.APPLE_OAUTH_CLIENT_ID;
  });

  it('rejects an unverified email', async () => {
    await expect(verifyIdToken('google', idToken({ email_verified: false }), keys)).rejects.toMatchObject({ status: 403 });
  });
});
