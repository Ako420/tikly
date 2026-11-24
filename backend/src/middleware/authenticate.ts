import type { RequestHandler } from 'express';
import { UserModel } from '../model/user.model';
import type { Language, Role, UserStatus } from '../types/enums';
import { assertActive } from '../util/accountStatus';
import { AppError } from '../util/AppError';
import { verifyAccessToken } from '../util/jwt';

export const authenticate: RequestHandler = async (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();
  const claims = verifyAccessToken(header.slice(7).trim());
  const user = await UserModel.findById(claims.sub).select('role status language organizerId').lean();
  if (!user) throw AppError.unauthorized();
  assertActive(user.status as UserStatus);
  req.user = {
    id: String(user._id),
    role: user.role as Role,
    language: user.language as Language,
    organizerId: user.organizerId?.toString(),
  };
  next();
};
