import type { ApiEvent, ApiTier } from '@/features/events/api';
import type { LocalizedText, TierName } from '@/features/events/types';
import type { PostType } from '@/features/posts/api';
import { api, http } from '@/lib/api';

export type OrganizerEvent = ApiEvent & { rejectionReason?: string; cancellationReason?: string };

export type TierStat = ApiTier & { sold: number; reserved: number; checkedIn: number };

export type EventStats = {
  tiers: TierStat[];
  totals: { ticketsSold: number; checkedIn: number; gross: number; commission: number; net: number; refunded: number };
};

export type EventInput = {
  title: LocalizedText;
  description: LocalizedText;
  category: string;
  coverUrl?: string;
  venue: string;
  city: string;
  country: string;
  startAt: string;
  endAt: string;
};

export type TierInput = { name: TierName; price: number; quantity: number; salesEndAt: string };

export type StaffMember = {
  id: string;
  name: string;
  phone: string;
  status: 'active' | 'disabled';
  events: { id: string; title: LocalizedText }[];
};

export type PostInput = {
  type: PostType;
  title: LocalizedText;
  body: LocalizedText;
  images: string[];
  notify: boolean;
};

export type WorkspaceCounts = {
  budget?: { planned: number; actual: number };
  checklist?: { total: number; done: number };
  guests?: number;
  agenda?: number;
  slots?: { booked: number; total: number };
};

export const organizerApi = {
  events: () => api.get<OrganizerEvent[]>('/organizer/events', { params: { limit: 100 } }),
  event: (id: string) => api.get<OrganizerEvent & { tiers: ApiTier[] }>(`/events/${id}`),
  stats: (id: string) => api.get<EventStats>(`/events/${id}/stats`),
  createEvent: (input: EventInput) => api.post<OrganizerEvent>('/events', input),
  updateEvent: (id: string, input: Partial<EventInput>) => api.patch<OrganizerEvent>(`/events/${id}`, input),
  submitEvent: (id: string) => api.post<OrganizerEvent>(`/events/${id}/submit`),
  tiers: (eventId: string) => api.get<ApiTier[]>(`/events/${eventId}/tiers`),
  createTier: (eventId: string, input: TierInput) => api.post<ApiTier>(`/events/${eventId}/tiers`, input),
  updateTier: (id: string, input: Omit<TierInput, 'name'>) => api.patch<ApiTier>(`/tiers/${id}`, input),
  deleteTier: (id: string) => api.delete(`/tiers/${id}`),
  staff: () => api.get<StaffMember[]>('/organizer/staff'),
  createStaff: (input: { name: string; phone: string; password: string }) => api.post<StaffMember>('/organizer/staff', input),
  assignStaff: (eventId: string, staffId: string) => api.post(`/events/${eventId}/staff`, { staffId }),
  unassignStaff: (eventId: string, staffId: string) => api.delete(`/events/${eventId}/staff/${staffId}`),
  createPost: (eventId: string, input: PostInput) => api.post<{ notified: number }>(`/events/${eventId}/posts`, input),
  uploadImage: async (uri: string, mimeType = 'image/jpeg') => {
    const form = new FormData();
    form.append('file', { uri, name: `upload.${mimeType.split('/')[1] ?? 'jpg'}`, type: mimeType } as unknown as Blob);
    const { data } = await http.post<{ data: { url: string } }>('/uploads/image', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60_000,
    });
    return data.data.url;
  },
  workspace: async (eventId: string): Promise<WorkspaceCounts> => {
    const settle = <T,>(promise: Promise<T>) => promise.then((value) => value, () => undefined);
    const [budget, checklist, guests, agenda, slots] = await Promise.all([
      settle(api.get<{ totals: { planned: number; actual: number } }>(`/events/${eventId}/budget`)),
      settle(api.get<{ items: { done: boolean }[] }>(`/events/${eventId}/checklist`)),
      settle(http.get<{ meta: { total: number } }>(`/events/${eventId}/guests`, { params: { limit: 1 } })),
      settle(api.get<unknown[]>(`/events/${eventId}/agenda`)),
      settle(api.get<{ quantity: number; available: number }[]>(`/events/${eventId}/slots`)),
    ]);
    return {
      budget: budget?.totals,
      checklist: checklist && { total: checklist.items.length, done: checklist.items.filter((item) => item.done).length },
      guests: guests?.data.meta.total,
      agenda: agenda?.length,
      slots: slots && {
        total: slots.reduce((sum, slot) => sum + slot.quantity, 0),
        booked: slots.reduce((sum, slot) => sum + slot.quantity - slot.available, 0),
      },
    };
  },
};
