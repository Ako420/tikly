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

const HOUR = 60 * 60 * 1000;
const LATE_NIGHT_CUTOFF_HOURS = 6;

export const formatTime = (iso: string, language: Language) =>
  format(iso, language, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const dayKey = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(iso),
  );

const DAY_MS = 24 * HOUR;

export const calendarDaysUntil = (iso: string, now = Date.now()) =>
  Math.round((Date.parse(dayKey(iso)) - Date.parse(dayKey(new Date(now).toISOString()))) / DAY_MS);

export function getEventSpan(startIso: string, endIso: string) {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const lastDayIso = new Date(end - LATE_NIGHT_CUTOFF_HOURS * HOUR).toISOString();
  const multiDay = dayKey(lastDayIso) !== dayKey(startIso) && lastDayIso > startIso;
  return { multiDay, lastDayIso, days: Math.max(1, Math.ceil((end - start) / (24 * HOUR))) };
}

export function formatDateRange(startIso: string, endIso: string, language: Language, withYear = true) {
  const { multiDay, lastDayIso } = getEventSpan(startIso, endIso);
  const full: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short', ...(withYear && { year: 'numeric' }) };
  if (!multiDay) return format(startIso, language, full);
  const sameMonth = format(startIso, language, { month: 'numeric' }) === format(lastDayIso, language, { month: 'numeric' });
  const startPart = format(startIso, language, sameMonth ? { weekday: 'short', day: 'numeric' } : { weekday: 'short', day: 'numeric', month: 'short' });
  return `${startPart} – ${format(lastDayIso, language, full)}`;
}

export const formatTimeRange = (startIso: string, endIso: string, language: Language) =>
  `${formatTime(startIso, language)} – ${formatTime(endIso, language)}`;

export const formatDayMonthTime = (iso: string, language: Language) =>
  `${format(iso, language, { day: 'numeric', month: 'short' })}, ${formatTime(iso, language)}`;

export type RelativeTime = { unit: 'justNow' | 'minutes' | 'hours' | 'yesterday' | 'days'; count: number };

export function getRelativeTime(iso: string, now = Date.now()): RelativeTime {
  const minutes = Math.floor((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return { unit: 'justNow', count: 0 };
  if (minutes < 60) return { unit: 'minutes', count: minutes };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { unit: 'hours', count: hours };
  const days = Math.floor(hours / 24);
  return days === 1 ? { unit: 'yesterday', count: 1 } : { unit: 'days', count: days };
}

const monthKey =(date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIME_ZONE, year: 'numeric', month: '2-digit' }).format(date);

export const isInCurrentMonth = (iso: string, now = new Date()) => monthKey(new Date(iso)) === monthKey(now);
