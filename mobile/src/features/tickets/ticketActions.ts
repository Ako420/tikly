import { env } from '@/config/env';
import { cancelTicket } from './api';
import { reviewsApi } from '@/features/reviews/api';
import { ticketWallet } from './ticketWallet';
import type { TicketBundle } from './types';

export async function cancelTickets(bundle: TicketBundle, ticketIds: string[]) {
  if (env.useSampleData) {
    ticketWallet.cancelTickets(bundle.id, ticketIds);
    return;
  }
  for (const id of ticketIds) await cancelTicket(id);
}

export type ReviewInput = { rating: number; comment?: string; highlights: string[] };

export async function postReview(bundle: TicketBundle, { rating, comment }: ReviewInput) {
  if (env.useSampleData) {
    ticketWallet.setReview(bundle.id, rating);
    return;
  }
  await reviewsApi.createForEvent(bundle.event.id, { rating, comment: comment?.trim() || undefined });
}
