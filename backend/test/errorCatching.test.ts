import express, { type RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler';
import { authLimiter, paymentLimiter } from '../src/middleware/rateLimit';
import { requestId } from '../src/middleware/requestId';
import { AppError } from '../src/util/AppError';

const SECRET = 'test-secret-that-is-long-enough-for-hs256';

function appWith(...handlers: RequestHandler[]) {
  const app = express();
  app.use(requestId);
  app.get('/', ...handlers);
  app.use(errorHandler);
  return app;
}

describe('async errors (Express 5)', () => {
  it('catches errors thrown inside async handlers without a wrapper', async () => {
    const res = await request(
      appWith(async () => {
        await Promise.resolve();
        throw AppError.conflict('TIER_SOLD_OUT');
      }),
    ).get('/');
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'TIER_SOLD_OUT', message: 'This ticket tier is sold out.', details: null });
  });

  it('hides internal details of unexpected errors', async () => {
    const res = await request(
      appWith(async () => {
        throw new Error('connection string mongodb://admin:secret@db');
      }),
    ).get('/');
    expect(res.status).toBe(500);
    expect(res.body.error.code).toBe('INTERNAL');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });

  it('leaves a response alone when the error happens after it was sent', async () => {
    const res = await request(
      appWith(async (_req, res) => {
        res.status(200).json({ received: true });
        throw new Error('late failure');
      }),
    ).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });
});

describe('JWT errors', () => {
  it('turns an expired token into TOKEN_EXPIRED', async () => {
    const token = jwt.sign({ sub: 'u1' }, SECRET, { expiresIn: -10 });
    const res = await request(appWith(() => void jwt.verify(token, SECRET))).get('/');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('turns a forged or malformed token into UNAUTHORIZED', async () => {
    const forged = jwt.sign({ sub: 'u1' }, 'another-secret-that-is-also-long-enough');
    const forgedRes = await request(appWith(() => void jwt.verify(forged, SECRET))).get('/');
    const garbageRes = await request(appWith(() => void jwt.verify('not.a.token', SECRET))).get('/');
    expect(forgedRes.status).toBe(401);
    expect(forgedRes.body.error.code).toBe('UNAUTHORIZED');
    expect(garbageRes.body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('rate limits', () => {
  it('allows 10 auth requests a minute per IP, then returns RATE_LIMITED', async () => {
    const app = appWith(authLimiter, (_req, res) => void res.json({ ok: true }));
    for (let i = 0; i < 10; i += 1) expect((await request(app).get('/')).status).toBe(200);
    const blocked = await request(app).get('/').set('Accept-Language', 'fr');
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toEqual({
      code: 'RATE_LIMITED',
      message: 'Trop de tentatives. Patientez une minute puis réessayez.',
      details: null,
    });
    expect(blocked.headers['ratelimit-policy']).toBeDefined();
  });

  it('counts payment requests per user, not per IP', async () => {
    const asUser = (id: string): RequestHandler => (req, _res, next) => {
      req.user = { id, role: 'attendee', language: 'en' };
      next();
    };
    const app = express();
    app.get('/:user', (req, res, next) => asUser(String(req.params.user))(req, res, next), paymentLimiter, (_req, res) => {
      res.json({ ok: true });
    });
    app.use(errorHandler);
    for (let i = 0; i < 5; i += 1) expect((await request(app).get('/ama')).status).toBe(200);
    expect((await request(app).get('/ama')).status).toBe(429);
    expect((await request(app).get('/ben')).status).toBe(200);
  });
});
