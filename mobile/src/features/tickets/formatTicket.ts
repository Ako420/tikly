import { localize } from '@/features/events/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { calendarDaysUntil, formatDateBadge, formatDateRange, formatTime } from '@/lib/dates';
import { eventEndsAt, SOON_DAYS, type TicketBundle } from './types';

export type TicketWhen = { label: string; soon: boolean; past: boolean };

const shortHolderName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  if (!first || rest.length === 0) return name;
  return `${first} ${rest.map((part) => `${part[0]?.toUpperCase()}.`).join(' ')}`;
};

export function useTicketFormatter() {
  const { t, language } = useTranslation();

  const when = (bundle: TicketBundle, now = Date.now()): TicketWhen => {
    const start = new Date(bundle.event.startAt).getTime();
    if (eventEndsAt(bundle.event) < now) return { label: t('myTickets.when.ended'), soon: false, past: true };
    if (start <= now) return { label: t('myTickets.when.live'), soon: true, past: false };
    const days = calendarDaysUntil(bundle.event.startAt, now);
    const label =
      days <= 0 ? t('myTickets.when.today') : days === 1 ? t('myTickets.when.tomorrow') : t('myTickets.when.inDays', { count: days });
    return { label, soon: days <= SOON_DAYS, past: false };
  };

  return {
    when,
    title: (bundle: TicketBundle) => localize(bundle.event.title, language),
    tier: (bundle: TicketBundle) => t(`tickets.tiers.${bundle.tierName}`),
    quantity: (bundle: TicketBundle) =>
      t('myTickets.quantity', { count: bundle.tickets.length, tier: t(`tickets.tiers.${bundle.tierName}`) }),
    meta: (bundle: TicketBundle) => `${formatTime(bundle.event.startAt, language)} · ${bundle.event.venue}`,
    badge: (bundle: TicketBundle) => formatDateBadge(bundle.event.startAt, language),
    doors: (bundle: TicketBundle) =>
      t('myTickets.detail.eyebrow', {
        date: formatDateRange(bundle.event.startAt, bundle.event.startAt, language, false).replace(/\./g, ''),
        time: formatTime(bundle.event.startAt, language),
      }),
    entrance: (bundle: TicketBundle) => bundle.event.entrance ?? t('myTickets.detail.entranceDefault'),
    holder: shortHolderName,
  };
}
