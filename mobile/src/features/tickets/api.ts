import type { LocalizedText, TierName } from '@/features/events/types';
import { api } from '@/lib/api';
import type { TicketBundle } from './types';

type ApiMyTicket = {
  id: string;
  code: string;
  qrToken: string;
  status: 'valid' | 'checked_in' | 'cancelled' | 'refunded';
  orderId: string;
  holderName?: string;
  tier: { id: string; name: TierName; price: number };
  checkIns?: { at: string; type: string }[];
  refundable?: boolean;
  event: {
    id: string;
    title: LocalizedText;
    startAt: string;
    endAt?: string;
    venue: string;
    city: string;
    coverUrl?: string;
  } | null;
  createdAt: string;
};

const PAGE_LIMIT = 100;
const HIDDEN_STATUSES: ApiMyTicket['status'][] = ['cancelled', 'refunded'];

const listTickets = (when: 'upcoming' | 'past') =>
  api.get<ApiMyTicket[]>('/me/tickets', { params: { when, limit: PAGE_LIMIT } });

export async function listMyTicketBundles(holderName: string): Promise<TicketBundle[]> {
  const [upcoming, past] = await Promise.all([listTickets('upcoming'), listTickets('past')]);
  const bundles = new Map<string, TicketBundle>();

  for (const ticket of [...upcoming, ...past]) {
    if (!ticket.event || !ticket.qrToken || HIDDEN_STATUSES.includes(ticket.status)) continue;
    const bundle = bundles.get(ticket.orderId) ?? {
      id: ticket.orderId,
      event: {
        id: ticket.event.id,
        title: ticket.event.title,
        startAt: ticket.event.startAt,
        endAt: ticket.event.endAt,
        venue: ticket.event.venue,
        city: ticket.event.city,
        coverUrl: ticket.event.coverUrl,
      },
      tierName: ticket.tier.name,
      purchasedAt: ticket.createdAt,
      tickets: [],
    };
    bundle.tickets.push({
      id: ticket.id,
      code: ticket.code,
      qrToken: ticket.qrToken,
      holderName: ticket.holderName ?? holderName,
      price: ticket.tier.price,
      refundable: ticket.refundable,
      checkedIn: (ticket.checkIns?.length ?? 0) > 0,
    });
    bundles.set(ticket.orderId, bundle);
  }

  return [...bundles.values()];
}

export type CancelTicketResult = { refund: { amount: number } };

export const cancelTicket = (ticketId: string) => api.post<CancelTicketResult>(`/tickets/${ticketId}/cancel`);
