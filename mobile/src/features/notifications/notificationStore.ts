import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { env } from '@/config/env';
import { api, toApiError, type ApiError } from '@/lib/api';
import { createSampleNotifications } from './sampleNotifications';
import type { AppNotification } from './types';

type NotificationState = {
  items: AppNotification[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error?: ApiError;
};

let state: NotificationState = { items: [], status: 'idle' };
const listeners = new Set<() => void>();

const setState = (patch: Partial<NotificationState>) => {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notificationsApi = {
  list: async () => (await api.get<{ items: AppNotification[] }>('/me/notifications')).items,
  markRead: (ids: string[]) => api.post<unknown>('/me/notifications/read', { ids }),
};

async function load() {
  setState({ status: 'loading', error: undefined });
  try {
    const items = env.useSampleData ? createSampleNotifications() : await notificationsApi.list();
    setState({ items, status: 'ready' });
  } catch (caught) {
    setState({ status: 'error', error: toApiError(caught) });
  }
}

async function markRead(ids: string[]) {
  const unread = state.items.filter((item) => ids.includes(item.id) && !item.readAt).map((item) => item.id);
  if (unread.length === 0) return;
  const readAt = new Date().toISOString();
  const previous = state.items;
  setState({ items: state.items.map((item) => (unread.includes(item.id) ? { ...item, readAt } : item)) });
  if (env.useSampleData) return;
  try {
    await notificationsApi.markRead(unread);
  } catch {
    setState({ items: previous });
  }
}

export const notificationStore = {
  markRead,
  markAllRead: () => markRead(state.items.map((item) => item.id)),
};

export function useNotifications() {
  const snapshot = useSyncExternalStore(subscribe, () => state);

  useEffect(() => {
    if (state.status === 'idle') load();
  }, []);

  const reload = useCallback(() => load(), []);
  const unreadCount = snapshot.items.filter((item) => !item.readAt).length;

  return {
    items: snapshot.items,
    unreadCount,
    loading: snapshot.status === 'idle' || snapshot.status === 'loading',
    error: snapshot.error,
    reload,
  };
}
