import { useCallback, useEffect, useRef, useState } from 'react';
import { toApiError, type ApiError } from '@/lib/api';

export function useAsync<T>(load: (() => Promise<T>) | null, key: string) {
  const loadRef = useRef(load);
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(Boolean(load));
  const [error, setError] = useState<ApiError>();
  const [version, setVersion] = useState(0);
  const enabled = Boolean(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    const current = loadRef.current;
    if (!enabled || !current) return;
    let active = true;
    current()
      .then((next) => {
        if (!active) return;
        setData(next);
        setError(undefined);
      })
      .catch((caught) => active && setError(toApiError(caught)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [enabled, key, version]);

  const reload = useCallback(() => {
    setLoading(true);
    setVersion((value) => value + 1);
  }, []);

  return { data, loading, error, reload, setData };
}
