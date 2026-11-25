import crypto from 'node:crypto';
import { env } from '../config/env';

const sign = (ticketId: string) =>
  crypto.createHmac('sha256', env.QR_SECRET).update(ticketId).digest('base64url').slice(0, 22);

export const createQrToken = (ticketId: string) => `${ticketId}.${sign(ticketId)}`;

export function verifyQrToken(token: string): string | null {
  const [ticketId, signature, ...rest] = token.split('.');
  if (!ticketId || !signature || rest.length) return null;
  const expected = sign(ticketId);
  if (signature.length !== expected.length) return null;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)) ? ticketId : null;
}
