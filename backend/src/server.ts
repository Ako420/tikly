import { buildApp } from './app';
import { env } from './config/env';
import { connectDb, disconnectDb } from './config/db';
import { logger } from './lib/logger';
import { registerProcessHandlers } from './lib/shutdown';

const app = buildApp();
const server = app.listen(env.PORT, () => logger.info(`API listening on http://localhost:${env.PORT}`));

registerProcessHandlers({ server, cleanup: disconnectDb });

connectDb().catch((err) => logger.error({ err }, 'MongoDB connection failed'));
