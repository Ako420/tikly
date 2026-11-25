import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env';
import { ACCESS_TOKEN_TTL_SECONDS, JWT_ISSUER, REFRESH_TOKEN_TTL_SECONDS } from '../config/constants';
import { LANGUAGES, ROLES, type Language, type Role } from '../types/enums';
import { AppError } from './AppError';

const ALGORITHM = 'HS256';

const accessClaims = z.object({ sub: z.string(), role: z.enum(ROLES), lang: z.enum(LANGUAGES) });
const refreshClaims = z.object({ sub: z.string(), jti: z.string() });

export type AccessClaims = { sub: string; role: Role; lang: Language };
export type RefreshClaims = z.infer<typeof refreshClaims>;

export function signAccessToken({ sub, role, lang }: AccessClaims) {
  return jwt.sign({ role, lang }, env.JWT_ACCESS_SECRET, {
    subject: sub,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: JWT_ISSUER,
    audience: 'access',
    algorithm: ALGORITHM,
  });
}

export function signRefreshToken(userId: string) {
  return jwt.sign({}, env.JWT_REFRESH_SECRET, {
    subject: userId,
    jwtid: randomUUID(),
    expiresIn: REFRESH_TOKEN_TTL_SECONDS,
    issuer: JWT_ISSUER,
    audience: 'refresh',
    algorithm: ALGORITHM,
  });
}

function verify<T>(token: string, secret: string, audience: string, schema: z.ZodType<T>): T {
  const decoded = jwt.verify(token, secret, { algorithms: [ALGORITHM], issuer: JWT_ISSUER, audience });
  const parsed = schema.safeParse(decoded);
  if (!parsed.success) throw AppError.unauthorized();
  return parsed.data;
}

export const verifyAccessToken = (token: string): AccessClaims =>
  verify(token, env.JWT_ACCESS_SECRET, 'access', accessClaims);

export const verifyRefreshToken = (token: string): RefreshClaims =>
  verify(token, env.JWT_REFRESH_SECRET, 'refresh', refreshClaims);
