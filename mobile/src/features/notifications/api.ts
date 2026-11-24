import { http } from '@/lib/api';

export type ApiNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

type NotificationPage = { data: ApiNotification[]; meta: { unread: number } };

export const notificationsApi = {
  list: async (page = 1, limit = 20) => {
    const { data } = await http.get<NotificationPage>('/me/notifications', { params: { page, limit } });
    return { items: data.data, unread: data.meta.unread };
  },
  read: (id: string) => http.patch(`/me/notifications/${id}/read`),
  readAll: () => http.patch('/me/notifications/read-all'),
};
