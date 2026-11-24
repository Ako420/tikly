import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';

const app = buildApp();

describe('auth rate limits (SEC-4)', () => {
  it('shares 10 requests a minute per IP across login, register and forgot-password', async () => {
    const paths = ['/login', '/register', '/forgot-password'];
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app)
        .post(`/api/v1/auth${paths[i % paths.length]}`)
        .send({});
      expect(res.status).toBe(400);
    }
    const blocked = await request(app).post('/api/v1/auth/login').send({});
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });

  it('does not rate-limit token refresh', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
  });
});
