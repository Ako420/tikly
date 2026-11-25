import type { PillTone } from '@/components/ui/StatusPill';
import type { Locale } from '@/i18n/dictionaries';
import type { BookingStatus, ProviderBooking } from './api';

export const intlLocale = (locale: Locale) => (locale === 'fr' ? 'fr-FR' : 'en-GB');

export const BOOKING_TONES: Record<BookingStatus, PillTone> = {
  requested: 'primary',
  accepted: 'warning',
  paid: 'valid',
  completed: 'neutral',
  declined: 'neutral',
  cancelled: 'neutral',
};

export const formatBookingRange = (
  booking: Pick<ProviderBooking, 'startDate' | 'endDate'>,
  locale: Locale,
  options: Intl.DateTimeFormatOptions,
) =>
  new Intl.DateTimeFormat(intlLocale(locale), options).formatRange(new Date(booking.startDate), new Date(booking.endDate));

export const formatDate = (iso: string, locale: Locale, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(intlLocale(locale), options).format(new Date(iso));

export function timeAgo(iso: string, locale: Locale) {
  const format = new Intl.RelativeTimeFormat(intlLocale(locale), { numeric: 'auto' });
  const minutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return format.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return format.format(hours, 'hour');
  return format.format(Math.round(hours / 24), 'day');
}

export function durationSince(iso: string, locale: Locale) {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  const [value, unit] =
    minutes < 60 ? [minutes, 'minute'] : minutes < 1440 ? [Math.round(minutes / 60), 'hour'] : [Math.round(minutes / 1440), 'day'];
  return new Intl.NumberFormat(intlLocale(locale), { style: 'unit', unit, unitDisplay: 'narrow' }).format(value);
}

export const isPast =(iso: string) => new Date(iso).getTime() < Date.now();

export const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
};

export const monthRange = (offset: number) => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const to = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59, 999);
  return { from, to };
};

export const fill = (template: string, values: Record<string, string | number>) =>
  Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, String(value)), template);
