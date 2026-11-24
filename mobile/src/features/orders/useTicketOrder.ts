import { useCallback, useEffect, useState } from 'react';
import { toApiError, type ApiError } from '@/lib/api';
import { getTicketOrder, verifyTicketOrder } from './orderService';
import { ORDER_POLL_INTERVAL_MS, type TicketOrder } from './types';

export function useTicketOrder(orderId: string | undefined) {
  const [order, setOrder] = useState<TicketOrder | undefined>();
  const [error, setError] = useState<ApiError | undefined>();
  const [verifying, setVerifying] = useState(false);

  const refresh = useCallback(async () => {
    if (!orderId) return;
    try {
      setOrder(await getTicketOrder(orderId));
      setError(undefined);
    } catch (caught) {
      setError(toApiError(caught));
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    let active = true;
    getTicketOrder(orderId)
      .then((next) => active && setOrder(next))
      .catch((caught) => active && setError(toApiError(caught)));
    return () => {
      active = false;
    };
  }, [orderId]);

  const pending = order?.status === 'pending';

  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(refresh, ORDER_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [pending, refresh]);

  const verify = useCallback(async () => {
    if (!orderId) return;
    setVerifying(true);
    try {
      setOrder(await verifyTicketOrder(orderId));
      setError(undefined);
    } catch (caught) {
      setError(toApiError(caught));
    } finally {
      setVerifying(false);
    }
  }, [orderId]);

  return { order, error, refresh, verify, verifying };
}

export function useCountdown(targetIso: string | undefined) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetIso) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [targetIso]);

  const remainingMs = targetIso ? Math.max(0, new Date(targetIso).getTime() - now) : 0;
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  return { remainingMs, label: `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` };
}
