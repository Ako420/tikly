import { api } from '@/lib/http/client';
import { ApiError } from '@/lib/http/errors';
import type { Locale } from '@/i18n/dictionaries';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type ProviderProfile = {
  id: string;
  businessName: string;
  verification: VerificationStatus;
};

export type LocalizedText = Partial<Record<Locale, string>>;

export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'paid' | 'completed' | 'cancelled';

export type ServiceUnit = 'per_day' | 'per_item' | 'per_event';

export type ProviderBooking = {
  id: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  quantity: number;
  amount: number | null;
  note?: string;
  declineReason?: string;
  service: { id: string; category: string; title: LocalizedText; unit: ServiceUnit; price: number; photo: string | null } | null;
  organizer: { id: string; name: string; phone: string } | null;
  event: { id: string; title: LocalizedText; startAt: string; city: string } | null;
  payment: { orderId: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
};

export const MIN_BOOKING_AMOUNT = 100;

const LIST_LIMIT = 100;

export const providerApi = {
  me: () =>
    api.get<ProviderProfile>('/providers/me').catch((error: unknown) => {
      if (error instanceof ApiError && error.status === 404) return null;
      throw error;
    }),
  pendingRequestCount: () =>
    api
      .get<unknown[]>('/bookings', { params: { status: 'requested', limit: LIST_LIMIT } })
      .then((bookings) => bookings.length),
  bookings: () => api.get<ProviderBooking[]>('/bookings', { params: { limit: LIST_LIMIT } }),
  acceptBooking: (id: string, amount: number) => api.post<ProviderBooking>(`/bookings/${id}/accept`, { amount }),
  declineBooking: (id: string, reason?: string) =>
    api.post<ProviderBooking>(`/bookings/${id}/decline`, reason ? { reason } : {}),
  completeBooking: (id: string) => api.post<ProviderBooking>(`/bookings/${id}/complete`),
};

export const localizeText = (text: LocalizedText | undefined, locale: Locale) =>
  text?.[locale] ?? text?.en ?? text?.fr ?? '';

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (iso: string) => {
  const date = new Date(iso);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

export const bookingDays = (booking: Pick<ProviderBooking, 'startDate' | 'endDate'>) =>
  Math.max(1, Math.round((startOfDay(booking.endDate) - startOfDay(booking.startDate)) / DAY_MS) + 1);

export const suggestedAmount = (booking: ProviderBooking) => {
  if (!booking.service) return 0;
  const base = booking.service.price * booking.quantity;
  return booking.service.unit === 'per_day' ? base * bookingDays(booking) : base;
};
