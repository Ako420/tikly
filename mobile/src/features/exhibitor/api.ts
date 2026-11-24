import type { ApiEvent } from '@/features/events/api';
import type { LocalizedText } from '@/features/events/types';
import { api } from '@/lib/api';

export type SlotEvent = ApiEvent & { slotsAvailable: number; slotPriceFrom: number | null };

export type Slot = { id: string; eventId: string; label: string; size?: string; price: number; quantity: number; available: number };

export type SlotBooking = {
  id: string;
  status: 'pending' | 'paid' | 'expired' | 'cancelled';
  quantity: number;
  orderId: string;
  slot: { id: string; label: string; size?: string; price: number } | null;
  event: { id: string; title: LocalizedText; startAt: string; venue: string; city: string } | null;
  createdAt: string;
};

export const exhibitorApi = {
  events: () => api.get<SlotEvent[]>('/exhibitor/events', { params: { limit: 50 } }),
  slots: (eventId: string) => api.get<Slot[]>(`/events/${eventId}/slots`),
  myBookings: () => api.get<SlotBooking[]>('/exhibitor/slot-bookings', { params: { limit: 50 } }),
};
