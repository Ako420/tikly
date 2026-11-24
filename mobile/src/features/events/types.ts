import type { Language } from '@/i18n/I18nProvider';

export const EVENT_CATEGORIES = ['concerts', 'sports', 'conferences', 'comedy', 'festivals', 'expos'] as const;

export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export type LocalizedText = Partial<Record<Language, string>>;

export type EventSummary = {
  id: string;
  title: LocalizedText;
  category: EventCategory;
  coverUrl?: string;
  venue: string;
  city: string;
  startAt: string;
  minPrice: number;
  hasMultipleTiers: boolean;
  sellingFast?: boolean;
  featured?: boolean;
};

export const localize = (text: LocalizedText, language: Language) => text[language] ?? text.en ?? text.fr ?? '';
