import request from 'supertest';
import express from 'express';
import { describe, expect, it, vi } from 'vitest';
import { buildApp } from '../src/app';
import { connectWithRetry } from '../src/config/db';
import { errorHandler } from '../src/middleware/errorHandler';

describe('connectWithRetry', () => {
  it('retries with growing delays until the connection succeeds', async () => {
    const connect = vi
      .fn()
      .mockRejectedValueOnce(new Error('ENOTFOUND'))
      .mockRejectedValueOnce(new Error('ENOTFOUND'))
      .mockResolvedValueOnce(undefined);
    const sleep = vi.fn(async () => {});
    await expect(connectWithRetry(connect, { sleep, baseDelayMs: 1000 })).resolves.toBe(3);
    expect(sleep.mock.calls).toEqual([[1000], [2000]]);
  });

  it('caps the delay and gives up after the last attempt', async () => {
    const connect = vi.fn().mockRejectedValue(new Error('auth failed'));
    const sleep = vi.fn(async () => {});
    await expect(connectWithRetry(connect, { sleep, attempts: 4, baseDelayMs: 5000, maxDelayMs: 8000 })).rejects.toThrow(
      'auth failed',
    );
    expect(connect).toHaveBeenCalledTimes(4);
    expect(sleep.mock.calls).toEqual([[5000], [8000], [8000]]);
  });
});

describe('database outages', () => {
  it('reports the API as unavailable on /health when MongoDB is not connected', async () => {
    const res = await request(buildApp()).get('/api/v1/health').set('Accept-Language', 'fr');
    expect(res.status).toBe(503);
    expect(res.body.error).toEqual({
      code: 'SERVICE_UNAVAILABLE',
      message: 'Le service est momentanément indisponible. Veuillez réessayer dans un instant.',
      details: null,
    });
  });

  it.each(['MongoServerSelectionError', 'MongooseServerSelectionError', 'MongoNetworkError'])(
    'turns %s into 503 SERVICE_UNAVAILABLE',
    async (name) => {
      const app = express();
      app.get('/', () => {
        throw Object.assign(new Error('getaddrinfo ENOTFOUND cluster0.mongodb.net'), { name });
      });
      app.use(errorHandler);
      const res = await request(app).get('/');
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(JSON.stringify(res.body)).not.toContain('mongodb.net');
    },
  );

  it('treats a query that timed out waiting for a connection as unavailable', async () => {
    const app = express();
    app.get('/', () => {
      throw Object.assign(new Error('Operation `users.findOne()` buffering timed out after 10000ms'), { name: 'MongooseError' });
    });
    app.use(errorHandler);
    expect((await request(app).get('/')).status).toBe(503);
  });
});
