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

export type TierName = 'standard' | 'vip' | 'vvip';

export type TicketTier = {
  id: string;
  name: TierName;
  perk: LocalizedText;
  price: number;
  remaining: number;
  salesEndAt: string;
};

export type LineupArtist = {
  id: string;
  name: string;
  role: LocalizedText;
  photoUrl: string;
  headliner?: boolean;
};

export type UpdateTag = 'lineup' | 'location' | 'info';

export type EventUpdate = {
  id: string;
  tag: UpdateTag;
  postedAt: string;
  body: LocalizedText;
  photoUrl?: string;
  place?: { name: string; address: string };
  likes: number;
  comments: number;
};

export type AgendaItem = {
  id: string;
  day: number;
  startAt: string;
  title: LocalizedText;
  location: LocalizedText;
};

export type EventDetails = EventSummary & {
  endAt: string;
  tagline?: LocalizedText;
  gallery: string[];
  rating?: { average: number; count: number };
  area: string;
  address: { label: string; line: string; pin?: string };
  organizer: { name: string; verified: boolean; eventsCount: number };
  tiers: TicketTier[];
  lineup: LineupArtist[];
  lineupTotal: number;
  about: LocalizedText;
  updates: EventUpdate[];
  updatesTotal: number;
  agenda: AgendaItem[];
};

export const localize =(text: LocalizedText, language: Language) => text[language] ?? text.en ?? text.fr ?? '';
