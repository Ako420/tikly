import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../lib/logger';

mongoose.connection.on('error', (err) => logger.error({ err }, 'MongoDB error'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

export async function connectDb() {
  await mongoose.connect(env.MONGO_URI);
  logger.info('MongoDB connected');
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
