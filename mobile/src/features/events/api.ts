import { api } from '@/lib/api';
import type { LocalizedText, TierName } from './types';

export type ApiEventStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'cancelled' | 'completed' | 'suspended';

export type ApiEvent = {
  id: string;
  organizerId: string;
  title: LocalizedText;
  description: LocalizedText;
  category: string;
  coverUrl?: string;
  venue: string;
  city: string;
  country: string;
  startAt: string;
  endAt: string;
  status: ApiEventStatus;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ApiEventListItem = ApiEvent & { priceFrom: number | null };

export type ApiTier = {
  id: string;
  name: TierName;
  price: number;
  quantity: number;
  available: number;
  salesEndAt: string;
  onSale: boolean;
};

export type ApiAgendaItem = {
  id: string;
  eventId: string;
  title: string;
  startAt: string;
  endAt: string;
  speaker?: string;
  location?: string;
};

export type ApiEventDetail = ApiEvent & {
  tiers: ApiTier[];
  agenda: ApiAgendaItem[];
  exhibitors: { name: string; slot: string; quantity: number }[];
};

export type ApiCategory = { key: string; en: string; fr: string };

export type ShareLinks = { url: string; whatsapp: string; facebook: string };

export type ListEventsParams = {
  page?: number;
  limit?: number;
  q?: string;
  city?: string;
  country?: string;
  category?: string;
  from?: string;
  to?: string;
};

export const eventsApi = {
  list: (params: ListEventsParams) => api.get<ApiEventListItem[]>('/events', { params, skipAuth: true }),
  get: (id: string) => api.get<ApiEventDetail>(`/events/${id}`),
  tiers: (eventId: string) => api.get<ApiTier[]>(`/events/${eventId}/tiers`),
  share: (id: string) => api.get<ShareLinks>(`/events/${id}/share`, { skipAuth: true }),
  categories: () => api.get<ApiCategory[]>('/categories', { skipAuth: true }),
};
