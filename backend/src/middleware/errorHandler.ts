import type { ErrorRequestHandler, Response } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import mongoose from 'mongoose';
import { MulterError } from 'multer';
import { ZodError } from 'zod';
import { AppError } from '../util/AppError';
import { hasTranslation, t } from '../util/i18n';
import { requestLanguage } from '../util/requestLanguage';
import { logger } from '../lib/logger';
import type { Language } from '../types/enums';

type FieldError = { code: string; message: string };
type BodyParserError = Error & { type: string; status?: number };

const DUPLICATE_CODES: Record<string, string> = {
  email: 'EMAIL_TAKEN',
  phone: 'PHONE_TAKEN',
  googleId: 'GOOGLE_ACCOUNT_MISMATCH',
  'eventId,name': 'TIER_EXISTS',
  'staffId,eventId': 'STAFF_ALREADY_ASSIGNED',
  'targetId,authorId': 'REVIEW_EXISTS',
};

function translateKey(key: string, lang: Language, params: Record<string, unknown> = {}) {
  return hasTranslation(key, 'en') ? t(key, lang, params) : key;
}

function mongooseFieldErrors(err: mongoose.Error.ValidationError, lang: Language) {
  const fields: Record<string, FieldError> = {};
  for (const [path, error] of Object.entries(err.errors)) {
    if (error instanceof mongoose.Error.CastError) {
      fields[path] = { code: 'validation.common.invalidValue', message: t('validation.common.invalidValue', lang) };
      continue;
    }
    const props: Record<string, unknown> = (error as mongoose.Error.ValidatorError).properties ?? {};
    const code = typeof props.message === 'string' ? props.message : error.message;
    const params = {
      min: props.minlength ?? props.min,
      max: props.maxlength ?? props.max,
      value: props.value,
    };
    fields[path] = { code, message: translateKey(code, lang, params) };
  }
  return fields;
}

function zodFieldErrors(err: ZodError, lang: Language) {
  const fields: Record<string, FieldError> = {};
  for (const issue of err.issues) {
    const path = issue.path.join('.') || '_';
    if (fields[path]) continue;
    const bounds = issue as { minimum?: unknown; maximum?: unknown };
    fields[path] = { code: issue.code, message: translateKey(issue.message, lang, { min: bounds.minimum, max: bounds.maximum }) };
  }
  return fields;
}

const DB_UNAVAILABLE_ERRORS = new Set([
  'MongooseServerSelectionError',
  'MongoServerSelectionError',
  'MongoNetworkError',
  'MongoNetworkTimeoutError',
  'MongoNotConnectedError',
  'MongoTopologyClosedError',
]);

function isDbUnavailable(err: unknown) {
  if (!(err instanceof Error)) return false;
  if (DB_UNAVAILABLE_ERRORS.has(err.name)) return true;
  return err.name === 'MongooseError' && /buffering timed out/i.test(err.message);
}

function isBodyParserError(err: unknown): err is BodyParserError {
  return err instanceof Error && typeof (err as BodyParserError).type === 'string' && (err as BodyParserError).type.startsWith('entity.');
}

function send(res: Response, status: number, code: string, lang: Language, details: unknown = null) {
  res.status(status).json({ success: false, error: { code, message: t(`errors.${code}`, lang), details } });
}

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    logger.error({ err, reqId: req.id }, 'Error after response was sent');
    return next(err);
  }

  const lang = requestLanguage(req);

  if (err instanceof AppError) return send(res, err.statusCode, err.code, lang, err.details ?? null);
  if (err instanceof ZodError) return send(res, 400, 'VALIDATION_ERROR', lang, zodFieldErrors(err, lang));
  if (err instanceof mongoose.Error.ValidationError) {
    return send(res, 400, 'VALIDATION_ERROR', lang, mongooseFieldErrors(err, lang));
  }
  if (err instanceof mongoose.Error.CastError) return send(res, 400, 'INVALID_ID', lang);
  if ((err as { code?: number }).code === 11000) {
    const fields = Object.keys((err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {});
    return send(res, 409, DUPLICATE_CODES[fields.join(',')] ?? 'DUPLICATE', lang, { fields });
  }
  if (err instanceof TokenExpiredError) return send(res, 401, 'TOKEN_EXPIRED', lang);
  if (err instanceof JsonWebTokenError) return send(res, 401, 'UNAUTHORIZED', lang);
  if (err instanceof MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return send(res, 413, 'FILE_TOO_LARGE', lang);
    if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
      return send(res, 400, 'FILE_REQUIRED', lang, { field: 'file' });
    }
    return send(res, 400, 'VALIDATION_ERROR', lang, { reason: err.code });
  }
  if (isBodyParserError(err)) {
    if (err.type === 'entity.too.large') return send(res, 413, 'PAYLOAD_TOO_LARGE', lang);
    return send(res, err.status && err.status < 500 ? err.status : 400, 'INVALID_JSON', lang);
  }

  if (isDbUnavailable(err)) {
    logger.error({ err, reqId: req.id }, 'Database unavailable');
    return send(res, 503, 'SERVICE_UNAVAILABLE', lang);
  }

  logger.error({ err, reqId: req.id }, 'Unhandled error');
  return send(res, 500, 'INTERNAL', lang);
};
