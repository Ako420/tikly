import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/errorHandler';
import { documentUpload, imageUpload } from '../src/middleware/upload';
import { JPEG, PDF, PNG, TEXT, WEBP } from './fixtures/files';

function appWith(upload: RequestHandler[]) {
  const app = express();
  app.post('/', ...upload, (req, res) => {
    res.json({ name: req.file!.originalname, type: req.file!.mimetype, size: req.file!.size });
  });
  app.use(errorHandler);
  return app;
}

const images = appWith(imageUpload);
const documents = appWith(documentUpload);

describe('image uploads', () => {
  it.each([
    ['cover.png', 'image/png', PNG],
    ['cover.jpg', 'image/jpeg', JPEG],
    ['cover.webp', 'image/webp', WEBP],
  ])('accepts %s', async (filename, contentType, buffer) => {
    const res = await request(images).post('/').attach('file', buffer, { filename, contentType });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: filename, type: contentType, size: buffer.length });
  });

  it('rejects images over 5 MB with FILE_TOO_LARGE', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const res = await request(images).post('/').attach('file', big, { filename: 'big.png', contentType: 'image/png' });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('rejects types outside JPEG, PNG and WebP with INVALID_FILE_TYPE', async () => {
    const res = await request(images)
      .post('/')
      .set('Accept-Language', 'fr')
      .attach('file', PDF, { filename: 'flyer.pdf', contentType: 'application/pdf' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    expect(res.body.error.message).toContain('Ce type de fichier');
    expect(res.body.error.details).toEqual({ allowed: ['image/jpeg', 'image/png', 'image/webp'] });
  });

  it('rejects a file whose contents do not match its declared type', async () => {
    const res = await request(images).post('/').attach('file', TEXT, { filename: 'fake.png', contentType: 'image/png' });
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
  });

  it('asks for a file when none is sent', async () => {
    const res = await request(images).post('/').field('caption', 'no file here');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatchObject({ code: 'FILE_REQUIRED', details: { field: 'file' } });
  });

  it('asks for the "file" field when the file is sent under another name', async () => {
    const res = await request(images).post('/').attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_REQUIRED');
  });
});

describe('document uploads', () => {
  it('accepts PDFs, and scans as JPEG or PNG', async () => {
    for (const [filename, contentType, buffer] of [
      ['id.pdf', 'application/pdf', PDF],
      ['id.jpg', 'image/jpeg', JPEG],
      ['id.png', 'image/png', PNG],
    ] as const) {
      expect((await request(documents).post('/').attach('file', buffer, { filename, contentType })).status).toBe(200);
    }
  });

  it('allows up to 10 MB but no more', async () => {
    const nineMb = Buffer.concat([PDF, Buffer.alloc(9 * 1024 * 1024)]);
    const elevenMb = Buffer.concat([PDF, Buffer.alloc(11 * 1024 * 1024)]);
    const ok = await request(documents).post('/').attach('file', nineMb, { filename: 'a.pdf', contentType: 'application/pdf' });
    const tooBig = await request(documents).post('/').attach('file', elevenMb, { filename: 'b.pdf', contentType: 'application/pdf' });
    expect(ok.status).toBe(200);
    expect(tooBig.status).toBe(413);
  });

  it('rejects WebP for documents', async () => {
    const res = await request(documents).post('/').attach('file', WEBP, { filename: 'id.webp', contentType: 'image/webp' });
    expect(res.status).toBe(415);
  });
});
