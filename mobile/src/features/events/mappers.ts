import { EVENT_TIME_ZONE } from '@/lib/dates';
import type { ApiAgendaItem, ApiEvent, ApiEventDetail, ApiEventListItem, ApiTier } from './api';
import { fromApiCategory } from './categories';
import type { AgendaItem, EventDetails, EventSummary, TicketTier } from './types';

const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: EVENT_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });
const dayNumber = (iso: string) => Date.parse(`${dayKey.format(new Date(iso))}T00:00:00Z`) / 86_400_000;

const baseSummary = (event: ApiEvent): Omit<EventSummary, 'minPrice' | 'hasMultipleTiers'> => ({
  id: event.id,
  title: event.title,
  category: fromApiCategory(event.category),
  coverUrl: event.coverUrl,
  venue: event.venue,
  city: event.city,
  startAt: event.startAt,
});

export const toEventSummary = (event: ApiEventListItem): EventSummary => ({
  ...baseSummary(event),
  minPrice: event.priceFrom ?? 0,
  hasMultipleTiers: event.priceFrom !== null && event.priceFrom > 0,
});

export const toTicketTier = (tier: ApiTier): TicketTier => ({
  id: tier.id,
  name: tier.name,
  perk: {},
  price: tier.price,
  remaining: tier.available,
  salesEndAt: tier.salesEndAt,
});

const toAgendaItem = (eventStart: string) => (item: ApiAgendaItem): AgendaItem => ({
  id: item.id,
  day: dayNumber(item.startAt) - dayNumber(eventStart) + 1,
  startAt: item.startAt,
  title: { en: item.title, fr: item.title },
  location: item.location ? { en: item.location, fr: item.location } : {},
});

export function toEventDetails(event: ApiEventDetail): EventDetails {
  const tiers = event.tiers.map(toTicketTier);
  const prices = tiers.map((tier) => tier.price);
  return {
    ...baseSummary(event),
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    hasMultipleTiers: tiers.length > 1,
    endAt: event.endAt,
    gallery: event.coverUrl ? [event.coverUrl] : [],
    rating: event.ratingCount > 0 ? { average: event.ratingAvg, count: event.ratingCount } : undefined,
    area: event.city,
    address: { label: event.venue, line: `${event.city}, ${event.country}` },
    tiers,
    lineup: [],
    lineupTotal: 0,
    about: event.description,
    updates: [],
    updatesTotal: 0,
    agenda: [...event.agenda].sort((a, b) => a.startAt.localeCompare(b.startAt)).map(toAgendaItem(event.startAt)),
  };
}
