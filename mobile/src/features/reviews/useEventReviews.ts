import { useCallback, useEffect, useState } from 'react';
import { env } from '@/config/env';
import { toApiError, type ApiError } from '@/lib/api';
import { reviewsApi, type EventReview } from './api';

export function useEventReviews(id: string | undefined) {
  const eventId = env.useSampleData ? undefined : id;
  const [items, setItems] = useState<EventReview[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(eventId));
  const [error, setError] = useState<ApiError>();

  const load = useCallback(
    async (next: number) => {
      if (!eventId) return;
      setLoading(true);
      try {
        const result = await reviewsApi.listForEvent(eventId, next);
        setItems((current) => (next === 1 ? result.items : [...current, ...result.items]));
        setPage(next);
        setPages(result.pages);
        setTotal(result.total);
        setError(undefined);
      } catch (caught) {
        setError(toApiError(caught));
      } finally {
        setLoading(false);
      }
    },
    [eventId],
  );

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    reviewsApi
      .listForEvent(eventId, 1)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setPage(1);
        setPages(result.pages);
        setTotal(result.total);
      })
      .catch((caught) => active && setError(toApiError(caught)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [eventId]);

  const loadMore = useCallback(() => {
    if (!loading && page < pages) load(page + 1);
  }, [load, loading, page, pages]);

  const prepend = useCallback((review: EventReview) => {
    setItems((current) => [review, ...current]);
    setTotal((current) => current + 1);
  }, []);

  return { items, total, loading, error, reload: () => load(1), loadMore, prepend };
}
