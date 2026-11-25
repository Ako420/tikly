import { api } from '@/lib/api';
import { toInternationalCameroonNumber } from '@/lib/validation';
import { newIdempotencyKey, type ApiOrder } from './api';

export type PayKind = 'booking' | 'slot';

export function createPayOrder(kind: PayKind, refId: string, quantity: number, phone: string) {
  const headers = { 'Idempotency-Key': newIdempotencyKey() };
  const msisdn = toInternationalCameroonNumber(phone);
  return kind === 'booking'
    ? api.post<ApiOrder>('/orders/bookings', { bookingId: refId, phone: msisdn }, { headers })
    : api.post<ApiOrder>('/orders/slots', { slotId: refId, quantity, phone: msisdn }, { headers });
}
