import type { RequestHandler } from 'express';
import multer from 'multer';
import {
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_TYPES,
  IMAGE_MAX_BYTES,
  IMAGE_MIME_TYPES,
  UPLOAD_FIELD,
} from '../config/constants';
import { AppError } from '../util/AppError';
import { detectFileType } from '../util/fileType';

function singleFile(maxBytes: number, allowed: readonly string[]): RequestHandler[] {
  const receive = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, done) => {
      if (allowed.includes(file.mimetype)) return done(null, true);
      done(new AppError(415, 'INVALID_FILE_TYPE', { allowed }));
    },
  }).single(UPLOAD_FIELD);

  const checkContents: RequestHandler = (req, _res, next) => {
    if (!req.file) throw AppError.badRequest('FILE_REQUIRED', { field: UPLOAD_FIELD });
    const actual = detectFileType(req.file.buffer);
    if (!actual || actual !== req.file.mimetype || !allowed.includes(actual)) {
      throw new AppError(415, 'INVALID_FILE_TYPE', { allowed });
    }
    next();
  };

  return [receive, checkContents];
}

export const imageUpload = singleFile(IMAGE_MAX_BYTES, IMAGE_MIME_TYPES);
export const documentUpload = singleFile(DOCUMENT_MAX_BYTES, DOCUMENT_MIME_TYPES);
