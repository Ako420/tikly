import type { ErrorRequestHandler, Request, Response } from 'express';
import mongoose from 'mongoose';
import { ZodError } from 'zod';
import { AppError } from '../util/AppError';
import { hasTranslation, t } from '../util/i18n';
import { logger } from '../lib/logger';
import type { Language } from '../types/enums';

type FieldError = { code: string; message: string };

const DUPLICATE_CODES: Record<string, string> = {
  email: 'EMAIL_TAKEN',
  phone: 'PHONE_TAKEN',
  'eventId,name': 'TIER_EXISTS',
  'staffId,eventId': 'STAFF_ALREADY_ASSIGNED',
  'targetId,authorId': 'REVIEW_EXISTS',
};

function resolveLanguage(req: Request): Language {
  const userLanguage = (req as Request & { user?: { language?: Language } }).user?.language;
  if (userLanguage) return userLanguage;
  return req.acceptsLanguages('en', 'fr') === 'fr' ? 'fr' : 'en';
}

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
    fields[path] = { code: issue.code, message: translateKey(issue.message, lang) };
  }
  return fields;
}

function send(res: Response, status: number, code: string, lang: Language, details: unknown = null) {
  res.status(status).json({ success: false, error: { code, message: t(`errors.${code}`, lang), details } });
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const lang = resolveLanguage(req);

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

  logger.error({ err }, 'Unhandled error');
  return send(res, 500, 'INTERNAL', lang);
};
