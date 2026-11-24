import type { LocalizedText, TierName } from '@/features/events/types';
import type { IssuedTicket, PaymentMethod } from '@/features/orders/types';

export type TicketEvent = {
  id: string;
  title: LocalizedText;
  startAt: string;
  endAt?: string;
  venue: string;
  city: string;
  coverUrl?: string;
  entrance?: string;
};

export type TicketBundle = {
  id: string;
  event: TicketEvent;
  tierName: TierName;
  tickets: IssuedTicket[];
  purchasedAt: string;
  unitPrice?: number;
  payment?: { method: PaymentMethod; phone: string };
  checkedInAt?: string;
  review?: { rating: number };
  cancellation?: { by: 'organizer' | 'attendee'; refundAmount: number };
};

export const REMINDER_HOURS = 24;
export const SOON_DAYS = 7;
export const REFUND_PERCENT = 50;
export const REFUND_CUTOFF_HOURS = 48;

const DEFAULT_EVENT_HOURS = 6;
const HOUR_MS = 60 * 60 * 1000;

export const eventEndsAt = (event: TicketEvent) =>
  event.endAt ? new Date(event.endAt).getTime() : new Date(event.startAt).getTime() + DEFAULT_EVENT_HOURS * HOUR_MS;

const isVoid = (ticket: IssuedTicket) => ticket.status === 'refunded' || ticket.status === 'cancelled';

export const activeTickets = (bundle: TicketBundle) => bundle.tickets.filter((ticket) => !isVoid(ticket));

export const isCancelledBundle = (bundle: TicketBundle) => !!bundle.cancellation || activeTickets(bundle).length === 0;

export const isPastBundle = (bundle: TicketBundle, now = Date.now()) => isCancelledBundle(bundle) || eventEndsAt(bundle.event) < now;

export const refundCutoff = (bundle: TicketBundle) => new Date(bundle.event.startAt).getTime() - REFUND_CUTOFF_HOURS * HOUR_MS;

export const refundFor = (unitPrice: number) => Math.floor((unitPrice * REFUND_PERCENT) / 100);

export const cancellableTickets = (bundle: TicketBundle, now = Date.now()) =>
  bundle.unitPrice && !isCancelledBundle(bundle) && now < refundCutoff(bundle)
    ? activeTickets(bundle).filter((ticket) => ticket.status !== 'checked_in')
    : [];
