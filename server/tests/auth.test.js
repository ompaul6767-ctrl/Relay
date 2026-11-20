import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/database.js';
import { seedDemoUsers } from '../src/services/seedUsers.js';
import { env } from '../src/config/environment.js';

describe('End-to-End Authentication & Dedicated Login Flow', () => {
  beforeAll(async () => {
    await connectDB();
    await seedDemoUsers();
  }, 30000);

  afterAll(async () => {
    await disconnectDB();
  });

  it('GET /api/auth/demo-accounts should return configured demo accounts', async () => {
    const res = await request(app).get('/api/auth/demo-accounts');
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
    expect(Array.isArray(res.body.accounts)).toBe(true);
    expect(res.body.accounts.length).toBeGreaterThanOrEqual(4);

    const judgeAcc = res.body.accounts.find((a) => a.email === env.DEMO_USER_EMAIL);
    expect(judgeAcc).toBeDefined();
    expect(judgeAcc.demoPassword).toBe(env.DEMO_USER_PASSWORD);
  });

  it('POST /api/auth/login should authenticate demo judge with valid credentials and return JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: env.DEMO_USER_EMAIL,
        password: env.DEMO_USER_PASSWORD,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(env.DEMO_USER_EMAIL.toLowerCase());
  });

  it('POST /api/auth/login should authenticate lead demo account (lead@relay.demo / relay2026!)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'lead@relay.demo',
        password: 'relay2026!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('lead');
  });

  it('POST /api/auth/login should reject invalid credentials with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: env.DEMO_USER_EMAIL,
        password: 'WrongPassword123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
    expect(res.body.token).toBeUndefined();
  });

  it('POST /api/auth/login should reject missing email or password with 400 Bad Request', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Missing credentials');
  });

  it('GET /api/auth/me should return authenticated user profile when token is provided', async () => {
    // 1. Log in
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: env.DEMO_USER_EMAIL,
        password: env.DEMO_USER_PASSWORD,
      });

    const token = loginRes.body.token;

    // 2. Fetch session
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.user).toBeDefined();
    expect(meRes.body.user.email).toBe(env.DEMO_USER_EMAIL.toLowerCase());
  });

  it('GET /api/auth/me should reject request without token with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('POST /api/auth/logout should return clean 200 response', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
