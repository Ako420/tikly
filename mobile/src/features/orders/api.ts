import { api } from '@/lib/api';
import { toInternationalCameroonNumber } from '@/lib/validation';
import type { CreateTicketOrderInput, IssuedTicket, OrderStatus } from './types';

export type ApiOrder = {
  id: string;
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
  amount: number;
  expiresAt: string;
  createdAt?: string;
  payment?: { provider: string; externalRef: string; message?: string };
  tickets?: { id: string; code: string; qrToken: string; holderName?: string }[];
};

export const toOrderStatus = (status: ApiOrder['status']): OrderStatus => (status === 'refunded' ? 'failed' : status);

export const toIssuedTickets = (order: ApiOrder, holderName: string): IssuedTicket[] =>
  (order.tickets ?? []).map((ticket) => ({
    id: ticket.id,
    code: ticket.code,
    qrToken: ticket.qrToken,
    holderName: ticket.holderName ?? holderName,
  }));

export const ordersApi = {
  createTicketOrder: (input: CreateTicketOrderInput) =>
    api.post<ApiOrder>('/orders/tickets', {
      eventId: input.eventId,
      tierId: input.tierId,
      quantity: input.quantity,
      phone: toInternationalCameroonNumber(input.phone),
    }),
  getOrder: (orderId: string) => api.get<ApiOrder>(`/orders/${orderId}`),
  verifyOrder: (orderId: string) => api.post<ApiOrder>(`/orders/${orderId}/verify`),
};
