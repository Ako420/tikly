import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const cloud = vi.hoisted(() => ({
  uploadPublicImage: vi.fn(),
  uploadPrivateDocument: vi.fn(),
}));

vi.mock('../src/lib/cloudinary', () => ({
  uploadPublicImage: cloud.uploadPublicImage,
  uploadPrivateDocument: cloud.uploadPrivateDocument,
  signedDocumentUrl: vi.fn(),
}));

import { buildApp } from '../src/app';
import { UserModel } from '../src/model/user.model';
import { ROLES, type Role } from '../src/types/enums';
import { AppError } from '../src/util/AppError';
import { signAccessToken } from '../src/util/jwt';
import { PDF, PNG, TEXT } from './fixtures/files';
import { useTestDatabase } from './helpers/db';

useTestDatabase('upload-routes');

const app = buildApp();
let phoneSuffix = 0;

async function tokenFor(role: Role, status: 'active' | 'suspended' = 'active') {
  phoneSuffix += 1;
  const organizer =
    role === 'staff'
      ? await UserModel.create({
          name: 'Owner',
          email: `owner${phoneSuffix}@example.cm`,
          phone: `+2376800${String(phoneSuffix).padStart(5, '0')}`,
          role: 'organizer',
          passwordHash: 'x',
        })
      : undefined;
  const user = await UserModel.create({
    name: `User ${role}`,
    ...(role !== 'staff' && { email: `${role}${phoneSuffix}@example.cm` }),
    phone: `+2376900${String(phoneSuffix).padStart(5, '0')}`,
    role,
    status,
    passwordHash: 'x',
    ...(organizer && { organizerId: organizer._id }),
  });
  return signAccessToken({ sub: user.id, role, lang: 'en' });
}

const postImage = (token: string | undefined, buffer = PNG, contentType = 'image/png') => {
  const req = request(app).post('/api/v1/uploads/image');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.attach('file', buffer, { filename: 'cover.png', contentType });
};

const postDocument = (token: string | undefined, buffer = PDF, contentType = 'application/pdf') => {
  const req = request(app).post('/api/v1/uploads/document');
  if (token) req.set('Authorization', `Bearer ${token}`);
  return req.attach('file', buffer, { filename: 'registration.pdf', contentType });
};

beforeEach(() => {
  cloud.uploadPublicImage.mockReset().mockImplementation(async (_buffer: Buffer, folder: string) => ({
    url: `https://res.cloudinary.com/demo/image/upload/${folder}/abc.png`,
    publicId: `${folder}/abc`,
  }));
  cloud.uploadPrivateDocument.mockReset().mockResolvedValue({ publicId: 'documents/xyz' });
});

describe('POST /uploads/image', () => {
  it.each([
    ['organizer', 'events'],
    ['exhibitor', 'events'],
    ['admin', 'events'],
    ['provider', 'services'],
  ] as const)('lets %s upload into %s/', async (role, folder) => {
    const res = await postImage(await tokenFor(role));
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      success: true,
      data: { url: `https://res.cloudinary.com/demo/image/upload/${folder}/abc.png`, publicId: `${folder}/abc` },
    });
    expect(cloud.uploadPublicImage).toHaveBeenCalledWith(expect.any(Buffer), folder);
  });

  it.each(['attendee', 'staff'] as const)('refuses %s', async (role) => {
    const res = await postImage(await tokenFor(role));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
    expect(cloud.uploadPublicImage).not.toHaveBeenCalled();
  });

  it('needs a login and uploads nothing without one', async () => {
    const res = await postImage(undefined);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(cloud.uploadPublicImage).not.toHaveBeenCalled();
  });

  it('refuses suspended accounts', async () => {
    const res = await postImage(await tokenFor('organizer', 'suspended'));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('rejects a file that is not really an image', async () => {
    const res = await postImage(await tokenFor('organizer'), TEXT, 'image/png');
    expect(res.status).toBe(415);
    expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    expect(cloud.uploadPublicImage).not.toHaveBeenCalled();
  });

  it('rejects images over 5 MB', async () => {
    const res = await postImage(await tokenFor('organizer'), Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });

  it('asks for a file when none is sent', async () => {
    const res = await request(app)
      .post('/api/v1/uploads/image')
      .set('Authorization', `Bearer ${await tokenFor('organizer')}`)
      .field('caption', 'nothing attached');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_REQUIRED');
  });

  it('reports a storage failure as UPLOAD_FAILED', async () => {
    cloud.uploadPublicImage.mockRejectedValue(new AppError(502, 'UPLOAD_FAILED'));
    const res = await postImage(await tokenFor('organizer'));
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('UPLOAD_FAILED');
  });
});

describe('POST /uploads/document', () => {
  it('stores a provider document privately and returns only its public id', async () => {
    const res = await postDocument(await tokenFor('provider'));
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: { publicId: 'documents/xyz' } });
    expect(cloud.uploadPrivateDocument).toHaveBeenCalledWith(expect.any(Buffer), 'documents');
  });

  it('accepts scanned documents as JPEG or PNG', async () => {
    expect((await postDocument(await tokenFor('provider'), PNG, 'image/png')).status).toBe(201);
  });

  it.each(ROLES.filter((role) => role !== 'provider'))('refuses %s (SEC-6)', async (role) => {
    const res = await postDocument(await tokenFor(role));
    expect(res.status).toBe(403);
    expect(cloud.uploadPrivateDocument).not.toHaveBeenCalled();
  });

  it('rejects documents over 10 MB', async () => {
    const res = await postDocument(await tokenFor('provider'), Buffer.concat([PDF, Buffer.alloc(10 * 1024 * 1024)]));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });
});
