import { http } from '@/lib/api';
import type { LocalizedText } from '@/features/events/types';

export type PostType = 'update' | 'speaker' | 'promo';

export type EventPost = {
  id: string;
  eventId: string;
  type: PostType;
  title: LocalizedText;
  body: LocalizedText;
  images: string[];
  speaker?: { name: string; role?: string; photoUrl?: string };
  pinned: boolean;
  createdAt: string;
};

type PostPage = { data: EventPost[]; meta: { total: number; pages: number } };

export const postsApi = {
  listForEvent: async (eventId: string, page = 1, limit = 20, type?: PostType) => {
    const { data } = await http.get<PostPage>(`/events/${eventId}/posts`, { params: { page, limit, type }, skipAuth: true });
    return { items: data.data, total: data.meta.total, pages: data.meta.pages };
  },
};
