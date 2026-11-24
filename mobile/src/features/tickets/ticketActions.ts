import { env } from '@/config/env';
import { api } from '@/lib/api';
import { ticketWallet } from './ticketWallet';
import type { TicketBundle } from './types';

export async function cancelTickets(bundle: TicketBundle, ticketIds: string[]) {
  if (env.useSampleData) {
    ticketWallet.cancelTickets(bundle.id, ticketIds);
    return;
  }
  for (const id of ticketIds) await api.post<unknown>(`/tickets/${id}/cancel`);
}

export type ReviewInput = { rating: number; comment?: string; highlights: string[] };

export async function postReview(bundle: TicketBundle, { rating, comment, highlights }: ReviewInput) {
  if (env.useSampleData) {
    ticketWallet.setReview(bundle.id, rating);
    return;
  }
  await api.post<unknown>(`/events/${bundle.event.id}/reviews`, {
    rating,
    comment: comment?.trim() || undefined,
    highlights,
  });
}
