import type { RequestHandler } from 'express';
import nodemailer from 'nodemailer';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const verifyIdToken = vi.hoisted(() => vi.fn());

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = verifyIdToken;
  },
}));

vi.mock('../src/middleware/rateLimit', () => {
  const pass: RequestHandler = (_req, _res, next) => next();
  return { authLimiter: pass, paymentLimiter: pass };
});

import { buildApp } from '../src/app';
import { setMailTransport } from '../src/lib/mailer';
import { UserModel } from '../src/model/user.model';
import { useTestDatabase } from './helpers/db';

useTestDatabase('google-auth');

const app = buildApp();

type Payload = { sub: string; email?: string; email_verified?: boolean; name?: string };
const googleUser: Payload = { sub: 'google-sub-1', email: 'Ama@Gmail.com', email_verified: true, name: 'Ama Ngono' };

function googleReturns(payload: Payload) {
  verifyIdToken.mockResolvedValue({ getPayload: () => payload });
}

const google = (body: Record<string, unknown>) => request(app).post('/api/v1/auth/google').send(body);
const signUp = (extra: Record<string, unknown> = {}) =>
  google({ idToken: 'id-token', role: 'attendee', phone: '677123456', ...extra });

let sent: string[] = [];

beforeEach(() => {
  verifyIdToken.mockReset();
  googleReturns(googleUser);
  sent = [];
  const transport = nodemailer.createTransport({ jsonTransport: true });
  const original = transport.sendMail.bind(transport);
  transport.sendMail = (async (mail: Parameters<typeof original>[0]) => {
    sent.push(String(mail.to));
    return original(mail);
  }) as typeof transport.sendMail;
  setMailTransport(transport);
});

describe('POST /auth/google', () => {
  it('checks the token against every configured client id', async () => {
    await signUp();
    expect(verifyIdToken).toHaveBeenCalledWith({
      idToken: 'id-token',
      audience: [
        'web.apps.googleusercontent.com',
        'android.apps.googleusercontent.com',
        'ios.apps.googleusercontent.com',
      ],
    });
  });

  it('asks for the missing sign-up details of a new user, prefilled from Google', async () => {
    const res = await google({ idToken: 'id-token' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({
      code: 'GOOGLE_SIGNUP_INCOMPLETE',
      details: { missing: ['role', 'phone'], email: 'ama@gmail.com', name: 'Ama Ngono' },
    });
    expect(await UserModel.countDocuments()).toBe(0);
  });

  it('signs up a new user without a password and sends a welcome email', async () => {
    const res = await signUp({ language: 'fr' });
    expect(res.status).toBe(201);
    expect(res.body.data.isNewUser).toBe(true);
    expect(res.body.data.user).toMatchObject({
      email: 'ama@gmail.com',
      name: 'Ama Ngono',
      phone: '+237677123456',
      role: 'attendee',
      language: 'fr',
    });
    expect(res.body.data.user.googleId).toBeUndefined();
    expect(res.body.data.tokens.accessToken).toEqual(expect.any(String));

    const stored = await UserModel.findOne({ email: 'ama@gmail.com' }).select('+passwordHash');
    expect(stored!.googleId).toBe('google-sub-1');
    expect(stored!.passwordHash).toBeUndefined();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(sent).toEqual(['ama@gmail.com']);
  });

  it('signs an existing Google user in without asking for details again', async () => {
    await signUp();
    const res = await google({ idToken: 'id-token' });
    expect(res.status).toBe(200);
    expect(res.body.data.isNewUser).toBe(false);
    expect(
      (await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${res.body.data.tokens.accessToken}`))
        .status,
    ).toBe(200);
  });

  it('keeps the role chosen at sign-up even if a later sign-in sends another', async () => {
    await signUp();
    const res = await google({ idToken: 'id-token', role: 'organizer' });
    expect(res.body.data.user.role).toBe('attendee');
  });

  it('links Google to an existing password account with the same email', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Ama',
        email: 'ama@gmail.com',
        phone: '699000000',
        password: 'correct-horse-9',
        role: 'organizer',
      });
    const res = await google({ idToken: 'id-token' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('organizer');
    expect((await UserModel.findOne({ email: 'ama@gmail.com' }))!.googleId).toBe('google-sub-1');

    const password = await request(app)
      .post('/api/v1/auth/login')
      .send({ identifier: 'ama@gmail.com', password: 'correct-horse-9' });
    expect(password.status).toBe(200);
  });

  it('refuses an email already linked to a different Google account', async () => {
    await signUp();
    googleReturns({ ...googleUser, sub: 'google-sub-2' });
    const res = await google({ idToken: 'id-token' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('GOOGLE_ACCOUNT_MISMATCH');
  });

  it('does not let Google into admin accounts', async () => {
    await UserModel.create({
      name: 'Admin',
      email: 'ama@gmail.com',
      phone: '+237699999999',
      role: 'admin',
      passwordHash: 'x',
    });
    const res = await google({ idToken: 'id-token' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('GOOGLE_NOT_ALLOWED');
  });

  it('blocks suspended accounts', async () => {
    await signUp();
    await UserModel.updateOne({ googleId: 'google-sub-1' }, { status: 'suspended' });
    const res = await google({ idToken: 'id-token' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('rejects a token Google does not accept', async () => {
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient, payload audience != requiredAudience'));
    const res = await signUp();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('GOOGLE_TOKEN_INVALID');
  });

  it('rejects an unverified Google email', async () => {
    googleReturns({ ...googleUser, email_verified: false });
    const res = await signUp();
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('GOOGLE_EMAIL_UNVERIFIED');
  });

  it('refuses staff and admin as sign-up roles, and a phone already in use', async () => {
    expect((await signUp({ role: 'admin' })).body.error.details.role.message).toBe('This account type does not exist.');
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Other',
        email: 'other@example.cm',
        phone: '677123456',
        password: 'correct-horse-9',
        role: 'attendee',
      });
    const res = await signUp();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PHONE_TAKEN');
  });

  it('requires an id token', async () => {
    const res = await google({});
    expect(res.status).toBe(400);
    expect(res.body.error.details.idToken.message).toBe('The Google sign-in token is missing.');
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
