import { v2 as cloudinary } from 'cloudinary';
import { afterAll, describe, expect, it } from 'vitest';
import { deleteAsset, signedDocumentUrl, uploadPrivateDocument, uploadPublicImage } from '../../src/lib/cloudinary';
import { PDF, PNG } from '../fixtures/files';

const folder = `tikly-test/${Date.now()}`;
const created: { publicId: string; type: 'upload' | 'authenticated' }[] = [];

afterAll(async () => {
  for (const asset of created) await deleteAsset(asset.publicId, asset.type).catch(() => undefined);
  await cloudinary.api.delete_folder(folder).catch(() => undefined);
});

describe('Cloudinary account (live)', () => {
  it('accepts the credentials in .env', async () => {
    const ping = await cloudinary.api.ping();
    expect(ping.status).toBe('ok');
  });

  it('uploads a public image that anyone can load', async () => {
    const image = await uploadPublicImage(PNG, `${folder}/events`);
    created.push({ publicId: image.publicId, type: 'upload' });
    expect(image.url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    const res = await fetch(image.url);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/^image\//);
  });

  it('keeps documents private and serves them only through a signed link', async () => {
    const document = await uploadPrivateDocument(PDF, `${folder}/documents`);
    created.push({ publicId: document.publicId, type: 'authenticated' });

    const publicUrl = cloudinary.url(document.publicId, { type: 'upload', resource_type: 'image', format: 'pdf', secure: true });
    expect((await fetch(publicUrl)).ok).toBe(false);

    const unsignedUrl = cloudinary.url(document.publicId, { type: 'authenticated', resource_type: 'image', format: 'pdf', secure: true });
    expect((await fetch(unsignedUrl)).ok).toBe(false);

    const { url } = signedDocumentUrl(document.publicId);
    const signed = await fetch(url);
    expect(signed.status).toBe(200);
    expect(Buffer.from(await signed.arrayBuffer()).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('deletes what it uploaded', async () => {
    while (created.length) {
      const asset = created.pop()!;
      await expect(deleteAsset(asset.publicId, asset.type)).resolves.toBe(true);
    }
  });
});
