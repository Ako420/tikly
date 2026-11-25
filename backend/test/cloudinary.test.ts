import { v2 as cloudinary } from 'cloudinary';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { deleteAsset, signedDocumentUrl } from '../src/lib/cloudinary';
import { documentViewUrl, imageFolderFor, uploadDocument, uploadImage } from '../src/service/upload.service';
import { AppError } from '../src/util/AppError';
import { PDF, PNG } from './fixtures/files';

type UploadCallback = (error?: unknown, result?: { secure_url: string; public_id: string }) => void;

function mockUpload(outcome: { error?: unknown; result?: { secure_url: string; public_id: string } }) {
  return vi.spyOn(cloudinary.uploader, 'upload_stream').mockImplementation(((options: unknown, callback: UploadCallback) => ({
    end: () => callback(outcome.error, outcome.result),
  })) as never);
}

const file = (buffer: Buffer, mimetype: string) => ({ buffer, mimetype, originalname: 'x', size: buffer.length }) as Express.Multer.File;

afterEach(() => vi.restoreAllMocks());

describe('image folder by role', () => {
  it('stores provider images under services/ and everyone else under events/', () => {
    expect(imageFolderFor('provider')).toBe('services');
    expect(imageFolderFor('organizer')).toBe('events');
    expect(imageFolderFor('exhibitor')).toBe('events');
    expect(imageFolderFor('admin')).toBe('events');
  });
});

describe('uploadImage', () => {
  it('uploads a public image and returns its URL and public id', async () => {
    const spy = mockUpload({ result: { secure_url: 'https://res.cloudinary.com/demo/image/upload/services/abc.png', public_id: 'services/abc' } });
    await expect(uploadImage('provider', file(PNG, 'image/png'))).resolves.toEqual({
      url: 'https://res.cloudinary.com/demo/image/upload/services/abc.png',
      publicId: 'services/abc',
    });
    expect(spy.mock.calls[0]![0]).toMatchObject({ folder: 'services', type: 'upload', resource_type: 'image', overwrite: false });
  });

  it('turns a Cloudinary failure into 502 UPLOAD_FAILED', async () => {
    mockUpload({ error: { message: 'Invalid api_key', http_code: 401 } });
    const failure = await uploadImage('organizer', file(PNG, 'image/png')).catch((err: unknown) => err);
    expect(failure).toBeInstanceOf(AppError);
    expect(failure).toMatchObject({ statusCode: 502, code: 'UPLOAD_FAILED' });
  });
});

describe('uploadDocument (SEC-6)', () => {
  it('stores documents as authenticated assets and returns only the public id', async () => {
    const spy = mockUpload({ result: { secure_url: 'https://res.cloudinary.com/demo/image/authenticated/documents/id.pdf', public_id: 'documents/id' } });
    await expect(uploadDocument(file(PDF, 'application/pdf'))).resolves.toEqual({ publicId: 'documents/id' });
    expect(spy.mock.calls[0]![0]).toMatchObject({ folder: 'documents', type: 'authenticated' });
  });
});

describe('signed document links', () => {
  it('expire 10 minutes after they are created', () => {
    const now = Date.UTC(2026, 10, 24, 10, 0, 0);
    const { url, expiresAt } = signedDocumentUrl('documents/id', now);
    expect(expiresAt.toISOString()).toBe('2026-11-24T10:10:00.000Z');
    const params = new URL(url).searchParams;
    expect(params.get('expires_at')).toBe(String(now / 1000 + 600));
    expect(params.get('type')).toBe('authenticated');
    expect(params.get('public_id')).toBe('documents/id');
    expect(params.get('signature')).toBeTruthy();
  });

  it('are produced by the upload service for admins', () => {
    expect(documentViewUrl('documents/id').url).toContain('documents%2Fid');
  });
});

describe('deleteAsset', () => {
  it('deletes with the right delivery type and reports success', async () => {
    const spy = vi.spyOn(cloudinary.uploader, 'destroy').mockResolvedValue({ result: 'ok' });
    await expect(deleteAsset('documents/id', 'authenticated')).resolves.toBe(true);
    expect(spy).toHaveBeenCalledWith('documents/id', { type: 'authenticated', resource_type: 'image', invalidate: true });
  });
});
