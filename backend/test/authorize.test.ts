import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { authorize } from '../src/middleware/authorize';
import { errorHandler } from '../src/middleware/errorHandler';
import { ROLES, type Role } from '../src/types/enums';

function appFor(role: Role | undefined, ...allowed: Role[]) {
  const asUser: RequestHandler = (req, _res, next) => {
    if (role) req.user = { id: '64b000000000000000000000', role, language: 'en' };
    next();
  };
  const app = express();
  app.get('/', asUser, authorize(...allowed), (_req, res) => void res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

describe('authorize (AUTH-5)', () => {
  it.each(ROLES)('lets %s through only when its role is allowed', async (role) => {
    expect((await request(appFor(role, role)).get('/')).status).toBe(200);
    const others = ROLES.filter((other) => other !== role);
    const denied = await request(appFor(role, ...others)).get('/');
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('FORBIDDEN');
  });

  it('accepts any of several roles', async () => {
    expect((await request(appFor('admin', 'organizer', 'admin')).get('/')).status).toBe(200);
  });

  it('asks for a login when nobody is authenticated', async () => {
    const res = await request(appFor(undefined, 'attendee')).get('/');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
