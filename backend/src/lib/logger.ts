import pino from 'pino';
import { env } from '../config/env';

const LEVELS = { development: 'debug', test: 'silent', production: 'info' } as const;

export const logger = pino({
  level: LEVELS[env.NODE_ENV],
  transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
  redact: ['req.headers.authorization', 'req.headers.cookie'],
});
