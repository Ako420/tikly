import type { LocalizedText, TierName } from '@/features/events/types';

export type NotificationType =
  | 'account_welcome'
  | 'reminder_24h'
  | 'ticket_purchased'
  | 'ticket_refunded'
  | 'event_cancelled'
  | 'event_update';

export type NotificationPayload = {
  eventId?: string;
  eventTitle?: LocalizedText;
  startAt?: string;
  venue?: string;
  quantity?: number;
  tier?: TierName;
  amount?: number;
  method?: 'mtn' | 'orange';
  organizerName?: string;
  message?: LocalizedText;
  city?: string;
};

export type AppNotification = {
  id: string;
  type: NotificationType | string;
  payload: NotificationPayload;
  createdAt: string;
  readAt?: string;
};
