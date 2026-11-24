import { useCallback, useEffect, useState } from 'react';
import { env } from '@/config/env';
import { toApiError, type ApiError } from '@/lib/api';
import { postsApi, type EventPost, type PostType } from './api';

export function useEventPosts(id: string | undefined, { limit = 20, type }: { limit?: number; type?: PostType } = {}) {
  const eventId = env.useSampleData ? undefined : id;
  const [items, setItems] = useState<EventPost[]>([]);
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
        const result = await postsApi.listForEvent(eventId, next, limit, type);
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
    [eventId, limit, type],
  );

  useEffect(() => {
    if (!eventId) return;
    let active = true;
    postsApi
      .listForEvent(eventId, 1, limit, type)
      .then((result) => {
        if (!active) return;
        setItems(result.items);
        setPage(1);
        setPages(result.pages);
        setTotal(result.total);
        setError(undefined);
      })
      .catch((caught) => active && setError(toApiError(caught)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [eventId, limit, type]);

  const loadMore = useCallback(() => {
    if (!loading && page < pages) load(page + 1);
  }, [load, loading, page, pages]);

  return { items, total, loading, error, reload: () => load(1), loadMore };
}
