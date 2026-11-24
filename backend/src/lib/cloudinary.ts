import { v2 as cloudinary, type UploadApiOptions, type UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
import { DOCUMENT_URL_TTL_SECONDS } from '../config/constants';
import { AppError } from '../util/AppError';
import { logger } from './logger';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type StoredAsset = { url: string; publicId: string };
export type DeliveryType = 'upload' | 'authenticated';

function uploadBuffer(buffer: Buffer, options: UploadApiOptions) {
  return new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error || !result) return reject(error ?? new Error('Cloudinary returned no result'));
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function upload(buffer: Buffer, options: UploadApiOptions) {
  try {
    return await uploadBuffer(buffer, { resource_type: 'image', unique_filename: true, overwrite: false, ...options });
  } catch (err) {
    logger.error({ err, folder: options.folder }, 'Cloudinary upload failed');
    throw new AppError(502, 'UPLOAD_FAILED');
  }
}

export async function uploadPublicImage(buffer: Buffer, folder: string): Promise<StoredAsset> {
  const result = await upload(buffer, { folder, type: 'upload' });
  return { url: result.secure_url, publicId: result.public_id };
}

export async function uploadPrivateDocument(buffer: Buffer, folder: string): Promise<{ publicId: string }> {
  const result = await upload(buffer, { folder, type: 'authenticated' });
  return { publicId: result.public_id };
}

export function signedDocumentUrl(publicId: string, now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + DOCUMENT_URL_TTL_SECONDS;
  const url = cloudinary.utils.private_download_url(publicId, '', {
    type: 'authenticated',
    resource_type: 'image',
    expires_at: expiresAt,
  });
  return { url, expiresAt: new Date(expiresAt * 1000) };
}

export async function deleteAsset(publicId: string, type: DeliveryType = 'upload') {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { type, resource_type: 'image', invalidate: true });
    return result.result === 'ok';
  } catch (err) {
    logger.error({ err, publicId }, 'Cloudinary delete failed');
    throw new AppError(502, 'UPLOAD_FAILED');
  }
}
