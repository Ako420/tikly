import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { API_PREFIX } from './config/constants';
import { logger } from './lib/logger';
import { apiRouter } from './router';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

export function buildApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(pinoHttp({ logger }));
  app.use(API_PREFIX, apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
