import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useAuth } from '@/features/auth/AuthProvider';
import { env } from '@/config/env';
import { notificationsApi } from './api';

export function useUnreadCount() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const enabled = Boolean(user) && !env.useSampleData;

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      let active = true;
      notificationsApi
        .list(1, 1)
        .then((page) => active && setUnread(page.unread))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, [enabled]),
  );

  return enabled ? unread : 0;
}
