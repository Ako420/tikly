import type { Language } from '@/i18n/I18nProvider';

const LOCALES: Record<Language, string> = { en: 'en-GB', fr: 'fr-FR' };

export const EVENT_TIME_ZONE = 'Africa/Douala';

const format = (iso: string, language: Language, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(LOCALES[language], { timeZone: EVENT_TIME_ZONE, ...options }).format(new Date(iso));

export const formatEventDateTime = (iso: string, language: Language) => {
  const date = format(iso, language, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = format(iso, language, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${date} · ${time}`;
};

export const formatDateBadge = (iso: string, language: Language) => ({
  day: format(iso, language, { day: '2-digit' }),
  month: format(iso, language, { month: 'short' }).replace('.', '').toUpperCase(),
});

const monthKey = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIME_ZONE, year: 'numeric', month: '2-digit' }).format(date);

export const isInCurrentMonth = (iso: string, now = new Date()) => monthKey(new Date(iso)) === monthKey(now);
