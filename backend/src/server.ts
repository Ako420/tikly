import { buildApp } from './app';
import { env } from './config/env';
import { connectDb, disconnectDb } from './config/db';
import { logger } from './lib/logger';
import { registerProcessHandlers } from './lib/shutdown';

async function main() {
  await connectDb();
  const server = buildApp().listen(env.PORT, () => logger.info(`API listening on http://localhost:${env.PORT}`));
  registerProcessHandlers({ server, cleanup: disconnectDb });
}

main().catch((err) => {
  logger.fatal({ err }, 'API failed to start');
  process.exit(1);
});
