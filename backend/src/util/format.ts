import { APP_TIME_ZONE } from '../config/constants';
import type { Language } from '../types/enums';

const NBSP = ' ';
const LOCALES: Record<Language, string> = { en: 'en-GB', fr: 'fr-FR' };

export function formatXaf(amount: number) {
  const grouped = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return `${grouped}${NBSP}XAF`;
}

export function formatDateTime(date: Date | string, lang: Language) {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: APP_TIME_ZONE,
  }).format(new Date(date));
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value: unknown) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]!);
}
