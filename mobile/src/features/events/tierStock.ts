import type { TextTone } from '@/components/ui/Text';
import type { TicketTier } from './types';

export const LOW_STOCK_THRESHOLD = 50;
export const MAX_TICKETS_PER_ORDER = 10;

export type TierStock = { key: 'left' | 'onlyLeft' | 'soldOut' | 'salesClosed'; tone: TextTone; available: boolean };

export function getTierStock(tier: TicketTier, now = Date.now()): TierStock {
  if (new Date(tier.salesEndAt).getTime() <= now) return { key: 'salesClosed', tone: 'muted', available: false };
  if (tier.remaining <= 0) return { key: 'soldOut', tone: 'muted', available: false };
  if (tier.remaining <= LOW_STOCK_THRESHOLD) return { key: 'onlyLeft', tone: 'warning', available: true };
  return { key: 'left', tone: 'valid', available: true };
}
