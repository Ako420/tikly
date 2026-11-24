import { api } from '@/lib/api';
import { toInternationalCameroonNumber } from '@/lib/validation';
import type { CreateTicketOrderInput, IssuedTicket, OrderStatus } from './types';

export type ApiOrder = {
  id: string;
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
  eventId?: string;
  items: { refId: string; refModel: string; quantity: number; unitPrice: number }[];
  amount: number;
  phone?: string;
  expiresAt: string;
  createdAt?: string;
  payment?: { provider: string; externalRef: string; status?: string; message?: string | null } | null;
  tickets?: { id: string; code: string; qrToken?: string; holderName?: string }[];
};

export const toOrderStatus = (status: ApiOrder['status']): OrderStatus => (status === 'refunded' ? 'failed' : status);

export const toIssuedTickets = (order: ApiOrder, holderName: string): IssuedTicket[] =>
  (order.tickets ?? []).map((ticket) => ({
    id: ticket.id,
    code: ticket.code,
    qrToken: ticket.qrToken ?? '',
    holderName: ticket.holderName ?? holderName,
  }));

export const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export async function withQrTokens(order: ApiOrder): Promise<ApiOrder> {
  const tickets = order.tickets ?? [];
  if (tickets.every((ticket) => ticket.qrToken)) return order;
  const filled = await Promise.all(
    tickets.map(async (ticket) =>
      ticket.qrToken ? ticket : { ...ticket, qrToken: (await ordersApi.getTicket(ticket.id)).qrToken },
    ),
  );
  return { ...order, tickets: filled };
}

export const ordersApi = {
  createTicketOrder: (input: CreateTicketOrderInput, idempotencyKey: string) =>
    api.post<ApiOrder>(
      '/orders/tickets',
      {
        eventId: input.eventId,
        tierId: input.tierId,
        quantity: input.quantity,
        phone: toInternationalCameroonNumber(input.phone),
      },
      { headers: { 'Idempotency-Key': idempotencyKey } },
    ),
  getOrder: (orderId: string) => api.get<ApiOrder>(`/orders/${orderId}`),
  verifyOrder: (orderId: string) => api.post<ApiOrder>(`/orders/${orderId}/verify`),
  getTicket: (ticketId: string) => api.get<{ id: string; qrToken: string }>(`/tickets/${ticketId}`),
};
