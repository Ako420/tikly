'use client';

import { useCallback, useEffect, useState } from 'react';

type State<T> = { key: string; data: T | null; error: Error | null };

export function useAsync<T>(load: () => Promise<T>, deps: unknown[]) {
  const [version, setVersion] = useState(0);
  const key = JSON.stringify([...deps, version]);
  const [state, setState] = useState<State<T>>({ key: '', data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    load()
      .then((data) => !cancelled && setState({ key, data, error: null }))
      .catch(
        (caught: unknown) =>
          !cancelled &&
          setState((current) => ({
            key,
            data: current.data,
            error: caught instanceof Error ? caught : new Error(String(caught)),
          })),
      );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);
  const loading = state.key !== key;
  return { data: state.data, error: loading ? null : state.error, loading, reload };
}
