import { buildApp } from './app';
import { env } from './config/env';
import { connectDb, disconnectDb } from './config/db';
import { logger } from './lib/logger';

async function main() {
  const app = buildApp();
  const server = app.listen(env.PORT, () => logger.info(`API listening on http://localhost:${env.PORT}`));

  connectDb().catch((err) => logger.error({ err }, 'MongoDB connection failed'));

  const shutdown = async () => {
    server.close();
    await disconnectDb();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
