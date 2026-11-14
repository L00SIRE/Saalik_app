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
});
