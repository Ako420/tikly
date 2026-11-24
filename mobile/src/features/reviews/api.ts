import { api, http } from '@/lib/api';

export type EventReview = {
  id: string;
  rating: number;
  comment?: string;
  author: string;
  createdAt: string;
};

type ReviewPage = { data: EventReview[]; meta: { total: number; pages: number } };

export const reviewsApi = {
  listForEvent: async (eventId: string, page = 1, limit = 20) => {
    const { data } = await http.get<ReviewPage>(`/events/${eventId}/reviews`, { params: { page, limit }, skipAuth: true });
    return { items: data.data, total: data.meta.total, pages: data.meta.pages };
  },
  createForEvent: (eventId: string, input: { rating: number; comment?: string }) =>
    api.post<EventReview>(`/events/${eventId}/reviews`, input),
};
