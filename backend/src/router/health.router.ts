import { Router } from 'express';
import { isDbConnected } from '../config/db';
import { AppError } from '../util/AppError';
import { ok } from '../util/response';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  if (!isDbConnected()) throw AppError.serviceUnavailable();
  ok(res, { status: 'ok', db: 'up', time: new Date().toISOString() });
});
