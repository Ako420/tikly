import { api } from '@/lib/api';
import type { LocalizedText } from '@/features/events/types';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';

export type Order = {
  id: string;
  type: 'ticket' | 'service' | 'slot';
  status: OrderStatus;
  buyerId: string;
  payeeId: string;
  eventId?: string;
  items: { refId: string; refModel: string; quantity: number; unitPrice: number }[];
  amount: number;
  phone?: string;
  expiresAt?: string;
  paidAt?: string;
  event: { id: string; title: LocalizedText; startAt: string; venue: string; city: string } | null;
  payment: {
    provider: string;
    externalRef: string;
    status: string;
    message: string | null;
  } | null;
  tickets: { id: string; code: string; tierId: string; status: string }[];
  createdAt: string;
  updatedAt: string;
};

export type CreateTicketOrderInput = {
  eventId: string;
  tierId: string;
  quantity: number;
  phone: string;
};

export type ListMyOrdersParams = {
  page?: number;
  limit?: number;
  type?: Order['type'];
  status?: OrderStatus;
};

export const ORDER_POLL_INTERVAL_MS = 3_000;

export const newIdempotencyKey = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

export const ordersApi = {
  createTicketOrder: (input: CreateTicketOrderInput, idempotencyKey: string) =>
    api.post<Order>('/orders/tickets', input, { headers: { 'Idempotency-Key': idempotencyKey } }),
  get: (id: string) => api.get<Order>(`/orders/${id}`),
  verify: (id: string) => api.post<Order>(`/orders/${id}/verify`),
  listMine: (params: ListMyOrdersParams = {}) => api.get<Order[]>('/me/orders', { params }),
};
