import type { LocalizedText, TierName } from '@/features/events/types';
import { api } from '@/lib/api';
import type { TicketBundle } from './types';

type ApiTicketOrder = {
  id: string;
  createdAt: string;
  event: { id: string; title: LocalizedText; startAt: string; venue: string; city: string } | null;
  tickets: { id: string; code: string; tierId: string; qrToken?: string; holderName?: string }[];
};

type ApiTier = { id: string; name: TierName };

const MAX_ORDERS = 50;

async function tierNames(eventIds: string[]) {
  const entries = await Promise.all(
    eventIds.map(async (eventId) => {
      const tiers = await api.get<ApiTier[]>(`/events/${eventId}/tiers`).catch(() => [] as ApiTier[]);
      return tiers.map((tier) => [tier.id, tier.name] as const);
    }),
  );
  return new Map(entries.flat());
}

export async function listMyTicketBundles(holderName: string): Promise<TicketBundle[]> {
  const { items } = await api.get<{ items: ApiTicketOrder[] }>('/me/orders', {
    params: { type: 'ticket', status: 'paid', limit: MAX_ORDERS },
  });
  const orders = items.filter((order) => order.event && order.tickets.length > 0);
  const names = await tierNames([...new Set(orders.map((order) => order.event!.id))]);

  return orders.map((order) => {
    const event = order.event!;
    return {
      id: order.id,
      event: { id: event.id, title: event.title, startAt: event.startAt, venue: event.venue, city: event.city },
      tierName: names.get(order.tickets[0].tierId) ?? 'standard',
      purchasedAt: order.createdAt,
      tickets: order.tickets.map((ticket) => ({
        id: ticket.id,
        code: ticket.code,
        qrToken: ticket.qrToken ?? '',
        holderName: ticket.holderName ?? holderName,
      })),
    };
  });
}
