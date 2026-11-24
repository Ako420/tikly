import type { TierName } from '@/features/events/types';

export type PaymentMethod = 'mtn' | 'orange';

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired';

export type IssuedTicket = {
  id: string;
  code: string;
  qrToken: string;
  holderName: string;
  price?: number;
  refundable?: boolean;
  checkedIn?: boolean;
};

export type TicketOrder = {
  id: string;
  eventId: string;
  tierId: string;
  tierName: TierName;
  quantity: number;
  unitPrice: number;
  amount: number;
  phone: string;
  method: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
  expiresAt: string;
  reference?: string;
  tickets: IssuedTicket[];
};

export type CreateTicketOrderInput = {
  eventId: string;
  tierId: string;
  quantity: number;
  phone: string;
  method: PaymentMethod;
  holderName: string;
  idempotencyKey?: string;
};

export const RESERVATION_MINUTES = 10;
export const ORDER_POLL_INTERVAL_MS = 3000;
