import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';

const app = buildApp();

describe('request bodies', () => {
  it('rejects malformed JSON with INVALID_JSON', async () => {
    const res = await request(app).post('/api/v1/health').set('Content-Type', 'application/json').send('{"name": ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'INVALID_JSON', message: 'The request body is not valid JSON.', details: null },
    });
  });

  it('answers in French when asked', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .set('Accept-Language', 'fr')
      .send('{oops}');
    expect(res.body.error.message).toBe("Le corps de la requête n'est pas un JSON valide.");
  });

  it('rejects bodies over 1 MB with PAYLOAD_TOO_LARGE', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ blob: 'x'.repeat(1024 * 1024 + 10) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});

describe('request ids', () => {
  it('adds a request id to every response, including errors', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('keeps a safe incoming request id and replaces an unsafe one', async () => {
    const kept = await request(app).get('/api/v1/health').set('X-Request-Id', 'mobile-abc12345');
    expect(kept.headers['x-request-id']).toBe('mobile-abc12345');
    const replaced = await request(app).get('/api/v1/health').set('X-Request-Id', 'bad id with spaces');
    expect(replaced.headers['x-request-id']).not.toBe('bad id with spaces');
  });
});
