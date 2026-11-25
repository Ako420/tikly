import mongoose from 'mongoose';
import { env } from './env';
import {
  DB_CONNECT_ATTEMPTS,
  DB_MAX_POOL_SIZE,
  DB_RETRY_BASE_DELAY_MS,
  DB_RETRY_MAX_DELAY_MS,
  DB_SERVER_SELECTION_TIMEOUT_MS,
} from './constants';
import { logger } from '../lib/logger';
import '../model';

mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB error'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function connectWithRetry(connect: () => Promise<unknown>, options: RetryOptions = {}) {
  const {
    attempts = DB_CONNECT_ATTEMPTS,
    baseDelayMs = DB_RETRY_BASE_DELAY_MS,
    maxDelayMs = DB_RETRY_MAX_DELAY_MS,
    sleep = wait,
  } = options;
  for (let attempt = 1; ; attempt += 1) {
    try {
      await connect();
      return attempt;
    } catch (err) {
      if (attempt >= attempts) throw err;
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      logger.warn({ err, attempt, nextRetryMs: delay }, 'MongoDB connection failed, retrying');
      await sleep(delay);
    }
  }
}

export async function ensureIndexes() {
  const names = mongoose.modelNames();
  await Promise.all(names.map((name) => mongoose.model(name).createIndexes()));
  return names.length;
}

export function isDbConnected() {
  return mongoose.connection.readyState === mongoose.ConnectionStates.connected;
}

export async function connectDb(uri = env.MONGO_URI) {
  await connectWithRetry(() =>
    mongoose.connect(uri, {
      serverSelectionTimeoutMS: DB_SERVER_SELECTION_TIMEOUT_MS,
      maxPoolSize: DB_MAX_POOL_SIZE,
      autoIndex: false,
    }),
  );
  const { host, name } = mongoose.connection;
  logger.info({ host, db: name }, 'MongoDB connected');
  const models = await ensureIndexes();
  logger.info({ models }, 'MongoDB indexes ensured');
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
