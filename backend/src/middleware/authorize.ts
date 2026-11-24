import type { RequestHandler } from 'express';
import type { Role } from '../types/enums';
import { AppError } from '../util/AppError';

export const authorize =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
