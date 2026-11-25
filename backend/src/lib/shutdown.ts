import type { Server } from 'node:http';
import { logger } from './logger';

type ProcessLike = Pick<NodeJS.Process, 'on' | 'exit'>;

type Options = {
  server: Server;
  cleanup: () => Promise<void>;
  proc?: ProcessLike;
  timeoutMs?: number;
};

export function registerProcessHandlers({ server, cleanup, proc = process, timeoutMs = 10_000 }: Options) {
  let shuttingDown = false;

  const shutdown = async (exitCode: number) => {
    if (shuttingDown) return;
    shuttingDown = true;
    const forceExit = setTimeout(() => {
      logger.fatal('Shutdown timed out, forcing exit');
      proc.exit(exitCode);
    }, timeoutMs);
    forceExit.unref();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await cleanup().catch((err) => logger.error({ err }, 'Cleanup failed during shutdown'));
    clearTimeout(forceExit);
    proc.exit(exitCode);
  };

  proc.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    void shutdown(1);
  });
  proc.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    void shutdown(1);
  });
  proc.on('SIGINT', () => void shutdown(0));
  proc.on('SIGTERM', () => void shutdown(0));

  return shutdown;
}
