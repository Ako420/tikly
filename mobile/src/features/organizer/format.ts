import type { EventStatus } from './types';

export const STATUS_TONE: Record<EventStatus, 'valid' | 'warning' | 'invalid' | 'neutral'> = {
  published: 'valid',
  pending: 'warning',
  rejected: 'invalid',
  draft: 'neutral',
  cancelled: 'invalid',
  completed: 'neutral',
  suspended: 'invalid',
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const daysUntil = (iso: string, now: number) => Math.ceil((new Date(iso).getTime() - now) / DAY_MS);
