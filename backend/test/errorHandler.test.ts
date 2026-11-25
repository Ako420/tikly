import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { EventModel, UserModel } from '../src/model';
import { errorHandler } from '../src/middleware/errorHandler';

function appThrowing(error: () => unknown) {
  const app = express();
  app.get('/', async () => {
    throw await error();
  });
  app.use(errorHandler);
  return app;
}

const invalidUser = () =>
  new UserModel({ name: 'Ama', email: 'not-an-email', phone: '677000000', passwordHash: 'x', role: 'attendee' }).validate();

describe('errorHandler', () => {
  it('returns field messages in English by default', async () => {
    const res = await request(appThrowing(() => invalidUser().catch((err) => err))).get('/');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Some fields are invalid. Please check and try again.');
    expect(res.body.error.details.email).toEqual({ code: 'validation.user.email.invalid', message: 'Enter a valid email address.' });
  });

  it('returns field messages in French when asked', async () => {
    const res = await request(appThrowing(() => invalidUser().catch((err) => err)))
      .get('/')
      .set('Accept-Language', 'fr-CM,fr;q=0.9');
    expect(res.body.error.message).toBe('Certains champs sont invalides. Vérifiez et réessayez.');
    expect(res.body.error.details.email.message).toBe('Saisissez une adresse e-mail valide.');
  });

  it('fills in limits such as the maximum length', async () => {
    const longVenue = 'x'.repeat(201);
    const res = await request(
      appThrowing(() =>
        new EventModel({ venue: longVenue })
          .validate()
          .catch((err) => err),
      ),
    ).get('/');
    expect(res.body.error.details.venue.message).toBe('The venue must be at most 200 characters.');
  });

  it('turns a wrongly typed value into a translated message', async () => {
    const res = await request(appThrowing(() => new EventModel({ startAt: 'not a date' }).validate().catch((err) => err)))
      .get('/')
      .set('Accept-Language', 'fr');
    expect(res.body.error.details.startAt).toEqual({
      code: 'validation.common.invalidValue',
      message: "Cette valeur n'a pas le bon format.",
    });
  });

  it('maps duplicate keys to specific codes', async () => {
    const duplicate = Object.assign(new Error('E11000'), { code: 11000, keyPattern: { phone: 1 } });
    const res = await request(appThrowing(() => duplicate)).get('/');
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'PHONE_TAKEN', message: 'An account with this phone number already exists.' });
  });
});
