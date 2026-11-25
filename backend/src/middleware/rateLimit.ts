import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { AppError } from '../util/AppError';

const ONE_MINUTE = 60 * 1000;

const rejectWithAppError = (_req: Request, _res: unknown, next: (err: AppError) => void) =>
  next(AppError.tooManyRequests());

export const authLimiter = rateLimit({
  windowMs: ONE_MINUTE,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: rejectWithAppError,
});

export const paymentLimiter = rateLimit({
  windowMs: ONE_MINUTE,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip ?? ''),
  handler: rejectWithAppError,
});
