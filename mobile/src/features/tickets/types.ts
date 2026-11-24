import type { LocalizedText, TierName } from '@/features/events/types';
import type { IssuedTicket } from '@/features/orders/types';

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
};

export const REMINDER_HOURS = 24;
export const SOON_DAYS = 7;

const DEFAULT_EVENT_HOURS = 6;
const HOUR_MS = 60 * 60 * 1000;

export const eventEndsAt = (event: TicketEvent) =>
  event.endAt ? new Date(event.endAt).getTime() : new Date(event.startAt).getTime() + DEFAULT_EVENT_HOURS * HOUR_MS;

export const isPastBundle = (bundle: TicketBundle, now = Date.now()) => eventEndsAt(bundle.event) < now;
