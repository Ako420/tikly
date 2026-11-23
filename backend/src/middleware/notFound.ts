import type { RequestHandler } from 'express';
import { AppError } from '../util/AppError';

export const notFound: RequestHandler = () => {
  throw AppError.notFound();
};
