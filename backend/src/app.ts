import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { API_PREFIX } from './config/constants';
import { logger } from './lib/logger';
import { apiRouter } from './router';
import { docsRouter } from './router/docs.router';
import { requestId } from './middleware/requestId';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';

export function buildApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestId);
  app.use(pinoHttp({ logger, genReqId: (req) => req.id ?? '' }));
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
      credentials: true,
      exposedHeaders: ['X-Request-Id'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use('/api', docsRouter);
  app.use(API_PREFIX, apiRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
