import { api } from '@/lib/http/client';
import { ApiError } from '@/lib/http/errors';
import type { Locale } from '@/i18n/dictionaries';

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export type ProviderProfile = {
  id: string;
  businessName: string;
  description?: string;
  city: string;
  country: string;
  phone: string;
  whatsapp?: string;
  documents: string[];
  verification: VerificationStatus;
  rejectionReason?: string;
  ratingAvg: number;
  ratingCount: number;
};

export type ProviderProfileInput = {
  businessName: string;
  description?: string;
  city: string;
  country: string;
  phone: string;
  whatsapp?: string;
  documents: string[];
};

export type LocalizedText = Partial<Record<Locale, string>>;

export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'paid' | 'completed' | 'cancelled';

export const SERVICE_CATEGORIES = ['hall', 'chairs', 'canopy', 'sound', 'catering', 'decoration', 'other'] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_UNITS = ['per_day', 'per_item', 'per_event'] as const;
export type ServiceUnit = (typeof SERVICE_UNITS)[number];

export type ProviderService = {
  id: string;
  category: ServiceCategory;
  title: LocalizedText;
  description?: string;
  photos: string[];
  city: string;
  price: number;
  unit: ServiceUnit;
  active: boolean;
  createdAt: string;
};

export type ServiceInput = {
  category: ServiceCategory;
  title: LocalizedText;
  description?: string;
  photos: string[];
  city: string;
  price: number;
  unit: ServiceUnit;
};

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

export type Earnings = {
  paidBookings: number;
  gross: number;
  commission: number;
  net: number;
  refunded: number;
};

export type ProviderReview = { id: string; rating: number; comment?: string; author: string; createdAt: string };

export const MIN_BOOKING_AMOUNT = 100;

const LIST_LIMIT = 100;

const notFoundAsNull = (error: unknown) => {
  if (error instanceof ApiError && error.status === 404) return null;
  throw error;
};

export const providerApi = {
  me: () => api.get<ProviderProfile>('/providers/me').catch(notFoundAsNull),
  createProfile: (input: ProviderProfileInput) => api.post<ProviderProfile>('/providers/me', input),
  updateProfile: (input: Partial<ProviderProfileInput>) => api.patch<ProviderProfile>('/providers/me', input),
  uploadDocument: (file: File) => api.upload<{ publicId: string }>('/uploads/document', file),
  uploadImage: (file: File) => api.upload<{ url: string }>('/uploads/image', file),
  pendingRequestCount: () =>
    api
      .get<unknown[]>('/bookings', { params: { status: 'requested', limit: LIST_LIMIT } })
      .then((bookings) => bookings.length),
  bookings: () => api.get<ProviderBooking[]>('/bookings', { params: { limit: LIST_LIMIT } }),
  acceptBooking: (id: string, amount: number) => api.post<ProviderBooking>(`/bookings/${id}/accept`, { amount }),
  declineBooking: (id: string, reason?: string) =>
    api.post<ProviderBooking>(`/bookings/${id}/decline`, reason ? { reason } : {}),
  completeBooking: (id: string) => api.post<ProviderBooking>(`/bookings/${id}/complete`),
  services: () => api.get<ProviderService[]>('/providers/me/services', { params: { limit: LIST_LIMIT } }),
  createService: (input: ServiceInput) => api.post<ProviderService>('/services', input),
  updateService: (id: string, input: Partial<ServiceInput>) => api.patch<ProviderService>(`/services/${id}`, input),
  removeService: (id: string) => api.delete<null>(`/services/${id}`),
  earnings: (range?: { from?: Date; to?: Date }) =>
    api.get<Earnings>('/providers/me/earnings', {
      params: { from: range?.from?.toISOString(), to: range?.to?.toISOString() },
    }),
  reviews: (providerId: string) =>
    api.get<ProviderReview[]>(`/providers/${providerId}/reviews`, { params: { limit: LIST_LIMIT } }),
};

export const localizeText = (text: LocalizedText | undefined, locale: Locale) =>
  text?.[locale] || text?.en || text?.fr || '';

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
