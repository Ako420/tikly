import type Ionicons from '@expo/vector-icons/Ionicons';
import type { Href } from 'expo-router';
import { localize } from '@/features/events/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { calendarDaysUntil, formatDateRange, formatTime, getRelativeTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { palette } from '@/theme';
import type { AppNotification } from './types';

export type NotificationLook = {
  icon: keyof typeof Ionicons.glyphMap;
  tile: string;
  iconColor: string;
};

const looks: Record<string, NotificationLook> = {
  reminder_24h: { icon: 'notifications', tile: palette.amber400, iconColor: palette.violet950 },
  ticket_purchased: { icon: 'ticket', tile: palette.green400, iconColor: palette.violet950 },
  event_update: { icon: 'megaphone', tile: palette.violet600, iconColor: palette.white },
  event_cancelled: { icon: 'close-circle', tile: palette.red400, iconColor: palette.white },
  ticket_refunded: { icon: 'cash', tile: palette.green400, iconColor: palette.violet950 },
  account_welcome: { icon: 'ticket', tile: palette.violet600, iconColor: palette.white },
};

const fallbackLook: NotificationLook = { icon: 'notifications', tile: palette.violet600, iconColor: palette.white };

export const isToday = (iso: string, now = Date.now()) => calendarDaysUntil(iso, now) === 0;

export function useNotificationFormatter() {
  const { t, language } = useTranslation();

  const eventName = (notification: AppNotification) =>
    notification.payload.eventTitle ? localize(notification.payload.eventTitle, language) : '';

  const when = (iso: string, now = Date.now()) => {
    const relative = getRelativeTime(iso, now);
    return t(`time.${relative.unit}`, { count: relative.count });
  };

  const content = (notification: AppNotification): { title: string; body: string } => {
    if (notification.title) return { title: notification.title, body: notification.body ?? '' };
    const { payload } = notification;
    const name = eventName(notification);
    switch (notification.type) {
      case 'reminder_24h': {
        const date = payload.startAt ? formatDateRange(payload.startAt, payload.startAt, language, false) : '';
        const time = payload.startAt ? formatTime(payload.startAt, language) : '';
        return {
          title: t('notifications.types.reminder.title', { event: name }),
          body: t('notifications.types.reminder.body', { event: name, date, time, venue: payload.venue ?? '' }),
        };
      }
      case 'ticket_purchased':
        return {
          title: t('notifications.types.purchase.title'),
          body: t('notifications.types.purchase.body', {
            count: payload.quantity ?? 1,
            tier: payload.tier ? t(`tickets.tiers.${payload.tier}`) : '',
            event: name,
            amount: payload.amount ? formatMoney(payload.amount) : '',
            method: payload.method ? t(`payments.methods.${payload.method}`) : '',
          }),
        };
      case 'event_update':
        return {
          title: t('notifications.types.update.title', { organizer: payload.organizerName ?? '' }),
          body: payload.message ? localize(payload.message, language) : '',
        };
      case 'event_cancelled':
        return {
          title: t('notifications.types.cancelled.title', { event: name }),
          body: payload.amount
            ? t('notifications.types.cancelled.body', { amount: formatMoney(payload.amount) })
            : t('notifications.types.cancelled.bodyNoRefund'),
        };
      case 'ticket_refunded':
        return {
          title: t('notifications.types.refunded.title'),
          body: t('notifications.types.refunded.body', { amount: payload.amount ? formatMoney(payload.amount) : '', event: name }),
        };
      case 'account_welcome':
        return {
          title: t('notifications.types.welcome.title'),
          body: t('notifications.types.welcome.body', { city: payload.city ?? '' }),
        };
      default:
        return { title: t('notifications.types.generic.title'), body: payload.message ? localize(payload.message, language) : '' };
    }
  };

  const target = (notification: AppNotification): Href | undefined => {
    const { eventId } = notification.payload;
    switch (notification.type) {
      case 'reminder_24h':
      case 'ticket_purchased':
        return '/tickets';
      case 'event_update':
        return eventId ? { pathname: '/events/[id]', params: { id: eventId } } : undefined;
      case 'account_welcome':
        return '/explore';
      default:
        return undefined;
    }
  };

  return {
    content,
    when,
    target,
    look: (notification: AppNotification) => looks[notification.type] ?? fallbackLook,
  };
}
