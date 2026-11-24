import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { env } from '../config/env';
import { AppError } from '../util/AppError';
import { logger } from './logger';

export type GoogleProfile = { googleId: string; email: string; name: string };

const client = new OAuth2Client();

const audiences = [env.GOOGLE_APP_CLIENT_ID, env.GOOGLE_WEB_CLIENT_ID].filter(Boolean);

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  if (audiences.length === 0) throw AppError.serviceUnavailable('GOOGLE_NOT_CONFIGURED');
  let payload: TokenPayload | undefined;
  try {
    payload = (await client.verifyIdToken({ idToken, audience: audiences })).getPayload();
  } catch (err) {
    logger.warn({ err: { message: (err as Error).message } }, 'Google ID token rejected');
    throw AppError.unauthorized('GOOGLE_TOKEN_INVALID');
  }
  if (!payload) throw AppError.unauthorized('GOOGLE_TOKEN_INVALID');
  if (!payload.email || payload.email_verified !== true) throw AppError.unauthorized('GOOGLE_EMAIL_UNVERIFIED');
  const email = payload.email.toLowerCase();
  const name = payload.name?.trim() || email.split('@')[0]!;
  return { googleId: payload.sub, email, name: name.length >= 2 ? name.slice(0, 100) : email.slice(0, 100) };
}
