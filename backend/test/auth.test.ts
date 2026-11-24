import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/rateLimit', () => {
  const pass: RequestHandler = (_req, _res, next) => next();
  return { authLimiter: pass, paymentLimiter: pass };
});

import { buildApp } from '../src/app';
import { setMailTransport } from '../src/lib/mailer';
import { UserModel } from '../src/model/user.model';
import { sha256 } from '../src/util/token';
import { useTestDatabase } from './helpers/db';

useTestDatabase('auth');

const app = buildApp();
const PASSWORD = 'correct-horse-9';

type SentMail = { to: string; subject: string; html: string };
let sent: SentMail[] = [];

beforeEach(() => {
  sent = [];
  const transport = nodemailer.createTransport({ jsonTransport: true });
  const original = transport.sendMail.bind(transport);
  transport.sendMail = (async (mail: Parameters<typeof original>[0]) => {
    sent.push({ to: String(mail.to), subject: String(mail.subject), html: String(mail.html) });
    return original(mail);
  }) as typeof transport.sendMail;
  setMailTransport(transport);
});

const attendee = (overrides: Record<string, unknown> = {}) => ({
  name: 'Ama Ngono',
  email: 'ama@example.cm',
  phone: '677 12 34 56',
  password: PASSWORD,
  role: 'attendee',
  ...overrides,
});

const register = (body: Record<string, unknown> = attendee()) => request(app).post('/api/v1/auth/register').send(body);
const login = (identifier: string, password = PASSWORD) =>
  request(app).post('/api/v1/auth/login').send({ identifier, password });
const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
const flush = () => new Promise((resolve) => setTimeout(resolve, 20));

describe('POST /auth/register', () => {
  it('creates the account, hides secrets, normalizes the phone and returns tokens', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    const { user, tokens } = res.body.data;
    expect(user).toMatchObject({
      name: 'Ama Ngono',
      email: 'ama@example.cm',
      phone: '+237677123456',
      role: 'attendee',
      language: 'en',
      status: 'active',
    });
    expect(user.id).toMatch(/^[0-9a-f]{24}$/);
    expect(JSON.stringify(user)).not.toMatch(/passwordHash|refreshTokenHash/);
    expect(tokens).toEqual({ accessToken: expect.any(String), refreshToken: expect.any(String), expiresIn: 900 });

    const stored = await UserModel.findById(user.id).select('+passwordHash +refreshTokenHash');
    expect(stored!.passwordHash).not.toBe(PASSWORD);
    expect(stored!.passwordHash).toMatch(/^\$2b\$12\$/);
    expect(stored!.refreshTokenHash).toBe(sha256(tokens.refreshToken));
  });

  it('sends a welcome email in the chosen language', async () => {
    await register(attendee({ language: 'fr', role: 'organizer' }));
    await flush();
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe('ama@example.cm');
    expect(sent[0]!.subject).toMatch(/Bienvenue/);
  });

  it.each(['staff', 'admin', 'superuser'])('rejects the %s role (AUTH-2)', async (role) => {
    const res = await register(attendee({ role }));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.role.message).toBe('This account type does not exist.');
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('ignores fields the client may not set', async () => {
    const res = await register({
      ...attendee(),
      status: 'suspended',
      organizerId: '64b000000000000000000000',
      passwordHash: 'x',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.status).toBe('active');
    expect(res.body.data.user.organizerId).toBeUndefined();
  });

  it('explains invalid fields in the request language', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .set('Accept-Language', 'fr')
      .send(attendee({ password: 'short', email: 'nope', phone: '12345', name: 'A' }));
    expect(res.status).toBe(400);
    const { details } = res.body.error;
    expect(details.password.message).toBe('Votre mot de passe doit contenir au moins 8 caractères.');
    expect(details.email.code).toBeDefined();
    expect(details.phone.message).toMatch(/camerounais/);
    expect(details.name.message).toMatch(/2/);
  });

  it('rejects passwords longer than bcrypt can hash', async () => {
    const res = await register(attendee({ password: 'é'.repeat(37) }));
    expect(res.status).toBe(400);
    expect(res.body.error.details.password.message).toBe('Your password is too long.');
  });

  it('refuses a taken email or phone, whatever format the phone is in', async () => {
    await register();
    const sameEmail = await register(attendee({ email: 'AMA@example.cm', phone: '699000000' }));
    expect(sameEmail.status).toBe(409);
    expect(sameEmail.body.error.code).toBe('EMAIL_TAKEN');
    const samePhone = await register(attendee({ email: 'other@example.cm', phone: '+237677123456' }));
    expect(samePhone.status).toBe(409);
    expect(samePhone.body.error.code).toBe('PHONE_TAKEN');
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await register();
  });

  it('logs in with email in any case, or phone in any format (AUTH-3)', async () => {
    for (const identifier of ['ama@example.cm', ' AMA@Example.CM ', '677123456', '+237 677 123 456', '237677123456']) {
      const res = await login(identifier);
      expect(res.status, identifier).toBe(200);
      expect(res.body.data.user.email).toBe('ama@example.cm');
      expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));
    }
  });

  it('gives the same answer for a wrong password and an unknown account', async () => {
    const wrongPassword = await login('ama@example.cm', 'not-the-password');
    const unknown = await login('nobody@example.cm');
    for (const res of [wrongPassword, unknown]) {
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }
  });

  it('blocks suspended and disabled accounts, but only after the password matches', async () => {
    await UserModel.updateOne({ email: 'ama@example.cm' }, { status: 'suspended' });
    expect((await login('ama@example.cm', 'wrong-password')).body.error.code).toBe('INVALID_CREDENTIALS');
    const suspended = await login('ama@example.cm');
    expect(suspended.status).toBe(403);
    expect(suspended.body.error.code).toBe('ACCOUNT_SUSPENDED');

    await UserModel.updateOne({ email: 'ama@example.cm' }, { status: 'disabled' });
    expect((await login('ama@example.cm')).body.error.code).toBe('ACCOUNT_DISABLED');
  });

  it('lets gate staff log in with their phone', async () => {
    const organizer = await UserModel.findOne({ email: 'ama@example.cm' });
    const bcrypt = await import('bcrypt');
    await UserModel.create({
      name: 'Gate 1',
      phone: '+237690000001',
      role: 'staff',
      organizerId: organizer!._id,
      passwordHash: await bcrypt.hash('gate-password', 4),
    });
    const res = await login('690000001', 'gate-password');
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ role: 'staff', organizerId: String(organizer!._id) });
  });

  it('requires both fields', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.details.identifier.message).toBe('Enter your email or phone number.');
    expect(res.body.error.details.password.message).toBe('A password is required.');
  });

  it('rejects Mongo operators instead of querying with them', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: { $gt: '' }, password: { $gt: '' } });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/refresh', () => {
  it('rotates the refresh token and rejects the old one', async () => {
    const { tokens } = (await register()).body.data;
    const first = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
    expect(first.status).toBe(200);
    const next = first.body.data.tokens;
    expect(next.refreshToken).not.toBe(tokens.refreshToken);
    expect((await request(app).get('/api/v1/auth/me').set(bearer(next.accessToken))).status).toBe(200);

    const replay = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('UNAUTHORIZED');
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: next.refreshToken })).status).toBe(
      200,
    );
  });

  it('lets only one of two concurrent refreshes with the same token win', async () => {
    const { tokens } = (await register()).body.data;
    const results = await Promise.all(
      [1, 2].map(() => request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken })),
    );
    expect(results.map((r) => r.status).sort()).toEqual([200, 401]);
  });

  it('does not accept an access token as a refresh token, or the reverse', async () => {
    const { tokens } = (await register()).body.data;
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.accessToken })).status).toBe(
      401,
    );
    expect((await request(app).get('/api/v1/auth/me').set(bearer(tokens.refreshToken))).status).toBe(401);
  });

  it('reports an expired refresh token as TOKEN_EXPIRED', async () => {
    const { user } = (await register()).body.data;
    const expired = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, process.env.JWT_REFRESH_SECRET!, {
      subject: user.id,
      jwtid: 'x',
      issuer: 'tikly',
      audience: 'refresh',
    });
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: expired });
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('refuses to refresh a suspended account', async () => {
    const { user, tokens } = (await register()).body.data;
    await UserModel.updateOne({ _id: user.id }, { status: 'suspended' });
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });
});

describe('POST /auth/logout', () => {
  it('revokes the refresh token and removes the device push token', async () => {
    const { tokens } = (await register()).body.data;
    const pushToken = 'ExponentPushToken[abc123]';
    await request(app).post('/api/v1/auth/me/push-tokens').set(bearer(tokens.accessToken)).send({ token: pushToken });

    const res = await request(app).post('/api/v1/auth/logout').set(bearer(tokens.accessToken)).send({ pushToken });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: null });

    const stored = await UserModel.findOne({ email: 'ama@example.cm' }).select('+refreshTokenHash');
    expect(stored!.refreshTokenHash).toBeUndefined();
    expect(stored!.pushTokens).toEqual([]);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken })).status).toBe(
      401,
    );
  });

  it('works without a body', async () => {
    const { tokens } = (await register()).body.data;
    expect((await request(app).post('/api/v1/auth/logout').set(bearer(tokens.accessToken))).status).toBe(200);
  });

  it('needs a logged-in user', async () => {
    expect((await request(app).post('/api/v1/auth/logout')).status).toBe(401);
  });
});

describe('authenticate', () => {
  it('rejects missing, malformed and forged tokens', async () => {
    const forged = jwt.sign({ role: 'admin', lang: 'en' }, 'not-the-real-secret-but-long-enough', {
      subject: '64b000000000000000000000',
      issuer: 'tikly',
      audience: 'access',
    });
    for (const headers of [{}, { Authorization: 'Token abc' }, bearer('not-a-jwt'), bearer(forged)]) {
      const res = await request(app).get('/api/v1/auth/me').set(headers);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    }
  });

  it('reports an expired access token as TOKEN_EXPIRED', async () => {
    const { user } = (await register()).body.data;
    const expired = jwt.sign(
      { role: 'attendee', lang: 'en', exp: Math.floor(Date.now() / 1000) - 10 },
      process.env.JWT_ACCESS_SECRET!,
      {
        subject: user.id,
        issuer: 'tikly',
        audience: 'access',
      },
    );
    const res = await request(app).get('/api/v1/auth/me').set(bearer(expired));
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('rejects the token of a deleted or suspended user straight away', async () => {
    const { user, tokens } = (await register()).body.data;
    await UserModel.updateOne({ _id: user.id }, { status: 'suspended' });
    expect((await request(app).get('/api/v1/auth/me').set(bearer(tokens.accessToken))).body.error.code).toBe(
      'ACCOUNT_SUSPENDED',
    );
    await UserModel.deleteOne({ _id: user.id });
    expect((await request(app).get('/api/v1/auth/me').set(bearer(tokens.accessToken))).status).toBe(401);
  });

  it('reads the role from the database, not from the token', async () => {
    const { user } = (await register()).body.data;
    const elevated = jwt.sign({ role: 'admin', lang: 'en' }, process.env.JWT_ACCESS_SECRET!, {
      subject: user.id,
      issuer: 'tikly',
      audience: 'access',
    });
    const res = await request(app).get('/api/v1/auth/me').set(bearer(elevated));
    expect(res.body.data.role).toBe('attendee');
  });
});

describe('/auth/me', () => {
  it('returns and updates the profile (AUTH-6)', async () => {
    const { tokens } = (await register()).body.data;
    const me = await request(app).get('/api/v1/auth/me').set(bearer(tokens.accessToken));
    expect(me.status).toBe(200);
    expect(me.body.data.email).toBe('ama@example.cm');

    const updated = await request(app)
      .patch('/api/v1/auth/me')
      .set(bearer(tokens.accessToken))
      .send({ name: 'Ama N.', language: 'fr', phone: '699 11 22 33', email: 'hijack@example.cm', role: 'admin' });
    expect(updated.status).toBe(200);
    expect(updated.body.data).toMatchObject({
      name: 'Ama N.',
      language: 'fr',
      phone: '+237699112233',
      email: 'ama@example.cm',
      role: 'attendee',
    });
  });

  it('answers errors in the saved language once it is changed', async () => {
    const { tokens } = (await register()).body.data;
    await request(app).patch('/api/v1/auth/me').set(bearer(tokens.accessToken)).send({ language: 'fr' });
    const res = await request(app).patch('/api/v1/auth/me').set(bearer(tokens.accessToken)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toBe('Certains champs sont invalides. Vérifiez et réessayez.');
    expect(res.body.error.details._.message).toBe('Envoyez au moins un champ à modifier.');
  });

  it('refuses a phone number that belongs to someone else', async () => {
    await register(attendee({ email: 'other@example.cm', phone: '699000000' }));
    const { tokens } = (await register()).body.data;
    const res = await request(app)
      .patch('/api/v1/auth/me')
      .set(bearer(tokens.accessToken))
      .send({ phone: '699000000' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PHONE_TAKEN');
  });
});

describe('/auth/me/push-tokens', () => {
  it('adds a token once and removes it', async () => {
    const { user, tokens } = (await register()).body.data;
    const token = 'ExponentPushToken[device-1]';
    for (let i = 0; i < 2; i += 1) {
      const res = await request(app)
        .post('/api/v1/auth/me/push-tokens')
        .set(bearer(tokens.accessToken))
        .send({ token });
      expect(res.status).toBe(200);
    }
    expect((await UserModel.findById(user.id))!.pushTokens).toEqual([token]);

    await request(app).delete('/api/v1/auth/me/push-tokens').set(bearer(tokens.accessToken)).send({ token });
    expect((await UserModel.findById(user.id))!.pushTokens).toEqual([]);
  });

  it('rejects tokens that are not Expo push tokens', async () => {
    const { tokens } = (await register()).body.data;
    const res = await request(app)
      .post('/api/v1/auth/me/push-tokens')
      .set(bearer(tokens.accessToken))
      .send({ token: 'fcm:abc' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.token.message).toBe('This push token is not a valid Expo push token.');
  });
});

describe('password reset (AUTH-4)', () => {
  const resetTokenFrom = (mail: SentMail) => {
    const match = mail.html.match(/reset-password\?token=([\w%-]+)/);
    return decodeURIComponent(match![1]!);
  };

  async function requestReset(email = 'ama@example.cm') {
    const res = await request(app).post('/api/v1/auth/forgot-password').send({ email });
    await flush();
    return res;
  }

  it('always answers 200, and only emails existing accounts', async () => {
    await register();
    await flush();
    sent = [];
    const unknown = await requestReset('nobody@example.cm');
    expect(unknown.status).toBe(200);
    expect(sent).toHaveLength(0);

    const known = await requestReset('AMA@example.cm');
    expect(known.body).toEqual(unknown.body);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.html).toContain('https://tikly.test/reset-password?token=');
  });

  it('stores only a hash of the token, with a one-hour expiry', async () => {
    await register();
    await requestReset();
    const token = resetTokenFrom(sent.at(-1)!);
    const stored = await UserModel.findOne({ email: 'ama@example.cm' }).select(
      '+passwordResetTokenHash +passwordResetExpiresAt',
    );
    expect(stored!.passwordResetTokenHash).toBe(sha256(token));
    const minutes = (stored!.passwordResetExpiresAt!.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(59);
    expect(minutes).toBeLessThanOrEqual(60);
  });

  it('sets the new password, signs out other sessions and works only once', async () => {
    const { tokens } = (await register()).body.data;
    await requestReset();
    const token = resetTokenFrom(sent.at(-1)!);

    const reset = await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'brand-new-pass' });
    expect(reset.status).toBe(200);
    expect((await login('ama@example.cm', 'brand-new-pass')).status).toBe(200);
    expect((await login('ama@example.cm')).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken })).status).toBe(
      401,
    );

    const again = await request(app).post('/api/v1/auth/reset-password').send({ token, password: 'another-pass-1' });
    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('RESET_TOKEN_INVALID');
  });

  it('rejects an expired or made-up token', async () => {
    await register();
    await requestReset();
    const token = resetTokenFrom(sent.at(-1)!);
    await UserModel.updateOne({ email: 'ama@example.cm' }, { passwordResetExpiresAt: new Date(Date.now() - 1000) });
    for (const candidate of [token, 'made-up-token']) {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({ token: candidate, password: 'brand-new-pass' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('RESET_TOKEN_INVALID');
    }
  });
});
