import { buildApp } from './app';
import { env } from './config/env';
import { connectDb, disconnectDb } from './config/db';
import { startJobs, stopJobs } from './lib/agenda';
import { logger } from './lib/logger';
import { registerProcessHandlers } from './lib/shutdown';

async function main() {
  await connectDb();
  await startJobs();
  const server = buildApp().listen(env.PORT, () => logger.info(`API listening on http://localhost:${env.PORT}`));
  registerProcessHandlers({
    server,
    cleanup: async () => {
      await stopJobs();
      await disconnectDb();
    },
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'API failed to start');
  process.exit(1);
});
