import { useCallback, useEffect, useMemo, useState } from 'react';
import { eventsApi, type ListEventsParams } from './api';
import { toApiCategory } from './categories';
import { toEventDetails, toEventSummary } from './mappers';
import type { EventCategory, EventDetails, EventSummary } from './types';

export type EventSort = 'soonest' | 'latest';

export type EventFilters = {
  city?: string;
  category?: EventCategory;
  thisMonth?: boolean;
  query?: string;
  sort?: EventSort;
};

export type Resource<T> = {
  data: T;
  loading: boolean;
  error: unknown;
  refetch: () => void;
};

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_LIMIT = 50;

function useAsync<T>(load: (() => Promise<T>) | null, initial: T, deps: unknown[]): Resource<T> {
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([...deps, attempt]);
  const [settled, setSettled] = useState<{ key: string; data: T; error: unknown } | null>(null);

  useEffect(() => {
    if (!load) return;
    let active = true;
    load().then(
      (data) => active && setSettled((previous) => ({ key, data, error: null })),
      (error: unknown) => active && setSettled((previous) => ({ key, data: previous?.data ?? initial, error })),
    );
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const refetch = useCallback(() => setAttempt((value) => value + 1), []);
  return {
    data: settled?.data ?? initial,
    loading: !!load && settled?.key !== key,
    error: settled?.key === key ? settled.error : null,
    refetch,
  };
}

function useDebounced<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function monthRange(now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from: (now > from ? now : from).toISOString(), to: to.toISOString() };
}

export function useEvents(filters: EventFilters): Resource<EventSummary[]> {
  const { city, category, thisMonth, sort = 'soonest' } = filters;
  const query = useDebounced(filters.query?.trim() ?? '', SEARCH_DEBOUNCE_MS);

  const resource = useAsync(
    async () => {
      const params: ListEventsParams = {
        limit: PAGE_LIMIT,
        city,
        category: toApiCategory(category),
        q: query || undefined,
        ...(thisMonth ? monthRange() : {}),
      };
      return (await eventsApi.list(params)).map(toEventSummary);
    },
    [],
    [city, category, thisMonth, query],
  );

  const data = useMemo(
    () => (sort === 'soonest' ? resource.data : [...resource.data].reverse()),
    [resource.data, sort],
  );
  return { ...resource, data };
}

export function useEventDetails(id: string | undefined): Resource<EventDetails | undefined> {
  return useAsync(id ? async () => toEventDetails(await eventsApi.get(id)) : null, undefined, [id]);
}
