import { localize, type LocalizedText } from '@/features/events/types';
import { useTranslation, type Language } from '@/i18n/I18nProvider';
import { formatDateRange, formatTime } from '@/lib/dates';
import { formatAmount } from '@/lib/money';
import type { CheckIn, GateEvent, ScannedTicket } from './types';

const shortDate = (iso: string, language: Language) => formatDateRange(iso, iso, language, false).replace(/\./g, '');

const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/);
  return rest.length > 0 ? `${first} ${rest[0][0]?.toUpperCase()}.` : name;
};

export function useGateFormatter() {
  const { t, language } = useTranslation();

  return {
    title: (text: LocalizedText) => localize(text, language),
    time: (iso: string) => formatTime(iso, language),
    eventMeta: (event: GateEvent) =>
      t('gate.events.meta', { date: shortDate(event.startAt, language), time: formatTime(event.startAt, language), area: event.area }),
    upcomingMeta: (event: GateEvent) =>
      t('gate.events.opensAt', { date: shortDate(event.scanningOpensAt, language), time: formatTime(event.scanningOpensAt, language) }),
    otherEventMeta: (startAt: string, venue: string) => `${shortDate(startAt, language)} · ${venue}`,
    count: formatAmount,
    tierLine: (ticket: ScannedTicket) => {
      const tier = t(`tickets.tiers.${ticket.tier}`);
      return ticket.position
        ? t('gate.result.ticketOf', { tier, index: ticket.position.index, total: ticket.position.total })
        : tier;
    },
    shortName,
    lastLine: (ticket: ScannedTicket) => t('gate.scanner.last', { tier: t(`tickets.tiers.${ticket.tier}`), name: shortName(ticket.holderName) }),
    firstEntry: (ticket: ScannedTicket): CheckIn | undefined => ticket.checkIns.find((checkIn) => checkIn.type === 'entry'),
    reentries: (ticket: ScannedTicket) => ticket.checkIns.filter((checkIn) => checkIn.type === 'reentry').length,
    ago: (iso: string, now = Date.now()) => {
      const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
      const hours = Math.floor(minutes / 60);
      const rest = minutes % 60;
      if (hours === 0) return t('gate.result.minutesAgo', { minutes: rest });
      return t('gate.result.hoursAgo', { hours, minutes: rest });
    },
  };
}
