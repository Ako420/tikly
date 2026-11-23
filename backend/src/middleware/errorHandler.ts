import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../util/AppError';
import { logger } from '../lib/logger';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.code, details: err.details ?? null },
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'VALIDATION_ERROR', details: err.flatten() },
    });
    return;
  }
  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ success: false, error: { code: 'INTERNAL', message: 'INTERNAL', details: null } });
};
