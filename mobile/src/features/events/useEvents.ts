import { useMemo } from 'react';
import { isInCurrentMonth } from '@/lib/dates';
import { getSampleEventDetails } from './sampleEventDetails';
import { sampleEvents } from './sampleEvents';
import { localize, type EventCategory, type EventSummary } from './types';
import type { Language } from '@/i18n/I18nProvider';

export type EventSort = 'soonest' | 'latest';

export type EventFilters = {
  city?: string;
  category?: EventCategory;
  thisMonth?: boolean;
  query?: string;
  sort?: EventSort;
};

const byStart = (sort: EventSort) => (a: EventSummary, b: EventSummary) => {
  const diff = new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
  return sort === 'soonest' ? diff : -diff;
};

export function filterEvents(events: EventSummary[], filters: EventFilters, language: Language) {
  const query = filters.query?.trim().toLowerCase();
  return events
    .filter((event) => new Date(event.startAt).getTime() >= Date.now())
    .filter((event) => !filters.city || event.city === filters.city)
    .filter((event) => !filters.category || event.category === filters.category)
    .filter((event) => !filters.thisMonth || isInCurrentMonth(event.startAt))
    .filter(
      (event) =>
        !query ||
        localize(event.title, language).toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query),
    )
    .sort(byStart(filters.sort ?? 'soonest'));
}

export function useEventDetails(id: string | undefined) {
  return useMemo(() => (id ? getSampleEventDetails(id) : undefined), [id]);
}

export function useEvents(filters: EventFilters, language: Language) {
  const { city, category, thisMonth, query, sort } = filters;
  return useMemo(
    () => filterEvents(sampleEvents, { city, category, thisMonth, query, sort }, language),
    [city, category, thisMonth, query, sort, language],
  );
}
