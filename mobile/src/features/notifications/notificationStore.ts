import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { env } from '@/config/env';
import { toApiError, type ApiError } from '@/lib/api';
import { notificationsApi, type ApiNotification } from './api';
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

const INBOX_PAGE_SIZE = 50;

const fromApi = (item: ApiNotification): AppNotification => ({
  id: item.id,
  type: item.type,
  title: item.title,
  body: item.body,
  payload: (item.data ?? {}) as AppNotification['payload'],
  createdAt: item.createdAt,
  readAt: item.readAt ?? undefined,
});

const fetchInbox = async () => (await notificationsApi.list(1, INBOX_PAGE_SIZE)).items.map(fromApi);

async function load() {
  setState({ status: 'loading', error: undefined });
  try {
    const items = env.useSampleData ? createSampleNotifications() : await fetchInbox();
    setState({ items, status: 'ready' });
  } catch (caught) {
    setState({ status: 'error', error: toApiError(caught) });
  }
}

async function markRead(ids: string[], all = false) {
  const unread = state.items.filter((item) => ids.includes(item.id) && !item.readAt).map((item) => item.id);
  if (unread.length === 0) return;
  const readAt = new Date().toISOString();
  const previous = state.items;
  setState({ items: state.items.map((item) => (unread.includes(item.id) ? { ...item, readAt } : item)) });
  if (env.useSampleData) return;
  try {
    if (all) await notificationsApi.readAll();
    else await Promise.all(unread.map((id) => notificationsApi.read(id)));
  } catch {
    setState({ items: previous });
  }
}

export const notificationStore = {
  markRead: (ids: string[]) => markRead(ids),
  markAllRead: () => markRead(state.items.map((item) => item.id), true),
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
