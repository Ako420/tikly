import { toLocalCameroonNumber } from '@/lib/validation';
import type { IssuedTicket, TicketOrder } from './types';

const SAMPLE_APPROVAL_MS = 8000;
const SAMPLE_DECLINE_SUFFIX = '000';

const orders = new Map<string, TicketOrder>();

const randomBlock = (length: number) =>
  Array.from({ length }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');

const issueTickets = (order: TicketOrder, holderName: string): IssuedTicket[] =>
  Array.from({ length: order.quantity }, (_, index) => {
    const id = `${order.id}-t${index + 1}`;
    return { id, code: `TK-${randomBlock(4)}-${randomBlock(2)}`, qrToken: `${id}.${randomBlock(22)}`, holderName };
  });

const holderNames = new Map<string, string>();

function advance(order: TicketOrder, now = Date.now()): TicketOrder {
  if (order.status !== 'pending') return order;
  const elapsed = now - new Date(order.createdAt).getTime();
  if (toLocalCameroonNumber(order.phone).endsWith(SAMPLE_DECLINE_SUFFIX) && elapsed > SAMPLE_APPROVAL_MS / 2) {
    return { ...order, status: 'failed' };
  }
  if (now > new Date(order.expiresAt).getTime()) return { ...order, status: 'expired' };
  if (elapsed > SAMPLE_APPROVAL_MS) {
    return {
      ...order,
      status: 'paid',
      reference: `TKL-${randomBlock(6)}`,
      tickets: issueTickets(order, holderNames.get(order.id) ?? ''),
    };
  }
  return order;
}

export const sampleOrders = {
  save(order: TicketOrder, holderName: string) {
    orders.set(order.id, order);
    holderNames.set(order.id, holderName);
    return order;
  },
  get(orderId: string) {
    const order = orders.get(orderId);
    if (!order) return undefined;
    const next = advance(order);
    if (next !== order) orders.set(orderId, next);
    return next;
  },
  newId: () => `ord-${Date.now().toString(36)}${randomBlock(4).toLowerCase()}`,
};
