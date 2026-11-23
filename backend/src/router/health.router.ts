import { Router } from 'express';
import mongoose from 'mongoose';
import { ok } from '../util/response';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  ok(res, { status: 'ok', db: mongoose.connection.readyState === 1 ? 'up' : 'down', time: new Date().toISOString() });
});
