import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { env } from '@/config/env';
import { useAuth } from '@/features/auth/AuthProvider';
import { sampleUser } from '@/features/events/sampleEvents';
import { toApiError, type ApiError } from '@/lib/api';
import { listMyTicketBundles } from './api';
import { ticketWallet } from './ticketWallet';
import { isPastBundle, type TicketBundle } from './types';

const CLOCK_TICK_MS = 60 * 1000;

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}

const byStart = (a: TicketBundle, b: TicketBundle) => a.event.startAt.localeCompare(b.event.startAt);

function useRemoteBundles(enabled: boolean, holderName: string) {
  const [bundles, setBundles] = useState<TicketBundle[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<ApiError>();

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    try {
      setBundles(await listMyTicketBundles(holderName));
      setError(undefined);
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setLoading(false);
    }
  }, [enabled, holderName]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    listMyTicketBundles(holderName)
      .then((next) => active && setBundles(next))
      .catch((caught) => active && setError(toApiError(caught)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [enabled, holderName]);

  return { bundles, loading, error, refresh };
}

export function useMyTickets() {
  const { user } = useAuth();
  const holderName = user?.name ?? sampleUser.name;
  const sample = useSyncExternalStore(ticketWallet.subscribe, ticketWallet.list);
  const remote = useRemoteBundles(!env.useSampleData, holderName);
  const source = env.useSampleData ? sample : remote.bundles;
  const now = useNow();

  const { upcoming, past } = useMemo(
    () => ({
      upcoming: source.filter((bundle) => !isPastBundle(bundle, now)).sort(byStart),
      past: source.filter((bundle) => isPastBundle(bundle, now)).sort((a, b) => byStart(b, a)),
    }),
    [source, now],
  );

  return {
    upcoming,
    past,
    loading: env.useSampleData ? false : remote.loading,
    error: env.useSampleData ? undefined : remote.error,
    refresh: remote.refresh,
  };
}

export function useTicketBundle(id: string | undefined) {
  const { upcoming, past, loading, error } = useMyTickets();
  const bundle = useMemo(() => [...upcoming, ...past].find((item) => item.id === id), [upcoming, past, id]);
  return { bundle, loading, error };
}
