import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/index';

const app = createApp();
const email = `auth-check-${Date.now()}@saalik.test`;
const password = 'correct-horse';

describe('issued access tokens validate on protected routes', () => {
  let accessToken = '';

  beforeAll(async () => {
    const registered = await request(app).post('/api/auth/register').send({
      email,
      password,
      name: 'Auth Check',
    });
    expect(registered.status).toBe(201);
    const loggedIn = await request(app).post('/api/auth/login').send({ email, password });
    expect(loggedIn.status).toBe(200);
    accessToken = loggedIn.body.accessToken as string;
    expect(accessToken).toEqual(expect.any(String));
  });

  const auth = () => ({ Authorization: `Bearer ${accessToken}` });

  it('rejects a missing token', async () => {
    const res = await request(app).get('/api/heritage/session');
    expect(res.status).toBe(401);
  });

  it('accepts the login token on bookings, guides, reviews, ai, and heritage', async () => {
    const bookings = await request(app).post('/api/bookings').set(auth()).send({});
    const guides = await request(app).get('/api/guides/me').set(auth());
    const reviews = await request(app).get('/api/reviews/my').set(auth());
    const ai = await request(app).get('/api/ai/suggestions').set(auth());
    const heritage = await request(app).get('/api/heritage/session').set(auth());

    expect(bookings.status).not.toBe(401);
    expect(guides.status).not.toBe(401);
    expect(reviews.status).not.toBe(401);
    expect(ai.status).toBe(200);
    expect(heritage.status).toBe(200);
    expect(heritage.body.userId).toEqual(expect.any(String));
  });

  it('answers social sign-in safely when a provider is unknown, incomplete or unconfigured', async () => {
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;
    const unknown = await request(app).post('/api/auth/oauth/facebook').send({ idToken: 'x' });
    const missing = await request(app).post('/api/auth/oauth/google').send({});
    const unconfigured = await request(app).post('/api/auth/oauth/google').send({ idToken: 'x' });
    expect(unknown.status).toBe(404);
    expect(missing.status).toBe(400);
    expect(unconfigured.status).toBe(503);
  });

  it('creates the account on first Google sign-in and reuses it on the next', async () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
    const jwks = { keys: [{ ...publicKey.export({ format: 'jwk' }), kid: 'k1' }] };
    const fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async () => new Response(JSON.stringify(jwks)));
    process.env.GOOGLE_OAUTH_CLIENT_ID = 'saalik-client';
    const googleEmail = `google-${Date.now()}@saalik.test`;
    const idToken = jwt.sign({ sub: 'g-1', email: googleEmail, email_verified: true, name: 'Google Traveler' }, privateKey, {
      algorithm: 'RS256',
      keyid: 'k1',
      expiresIn: '5m',
      issuer: 'https://accounts.google.com',
      audience: 'saalik-client',
    });

    const first = await request(app).post('/api/auth/oauth/google').send({ idToken });
    const second = await request(app).post('/api/auth/oauth/google').send({ idToken });
    fetchSpy.mockRestore();
    delete process.env.GOOGLE_OAUTH_CLIENT_ID;

    expect(first.status).toBe(200);
    expect(first.body.user).toMatchObject({ email: googleEmail, name: 'Google Traveler', role: 'TRAVELER' });
    expect(second.body.user.id).toBe(first.body.user.id);
    const me = await request(app).get('/api/auth/me').set({ Authorization: `Bearer ${first.body.accessToken}` });
    expect(me.body.email).toBe(googleEmail);
    // The account has no usable password.
    const passwordLogin = await request(app).post('/api/auth/login').send({ email: googleEmail, password: 'g-1' });
    expect(passwordLogin.status).toBe(401);
  });

  it('presigns an image upload only for a signed-in user with storage configured', async () => {
    const body = { contentType: 'image/jpeg', contentLength: 2_000_000 };
    const anonymous = await request(app).post('/api/uploads/presign').send(body);
    expect(anonymous.status).toBe(401);

    delete process.env.R2_BUCKET;
    const unconfigured = await request(app).post('/api/uploads/presign').set(auth()).send(body);
    expect(unconfigured.status).toBe(503);

    Object.assign(process.env, {
      R2_ACCOUNT_ID: 'acct',
      R2_ACCESS_KEY_ID: 'key',
      R2_SECRET_ACCESS_KEY: 'secret',
      R2_BUCKET: 'saalik-media',
    });
    const wrongType = await request(app)
      .post('/api/uploads/presign')
      .set(auth())
      .send({ ...body, contentType: 'text/html' });
    const tooLarge = await request(app)
      .post('/api/uploads/presign')
      .set(auth())
      .send({ ...body, contentLength: 50_000_000 });
    const signed = await request(app).post('/api/uploads/presign').set(auth()).send(body);
    expect(wrongType.status).toBe(400);
    expect(tooLarge.status).toBe(400);
    expect(signed.status).toBe(200);
    expect(signed.body.method).toBe('PUT');
    expect(signed.body.headers).toEqual({ 'Content-Type': 'image/jpeg', 'Content-Length': '2000000' });
    expect(signed.body.uploadUrl).toContain('X-Amz-SignedHeaders=content-length%3Bcontent-type%3Bhost');
    expect(signed.body.key).toMatch(/^uploads\/[^/]+\/[0-9a-f-]{36}\.jpg$/);
    expect(signed.body.uploadUrl).toContain(`https://acct.r2.cloudflarestorage.com/saalik-media/${signed.body.key}?`);
    expect(signed.body.uploadUrl).toMatch(/X-Amz-Signature=[0-9a-f]{64}$/);
  });
});
