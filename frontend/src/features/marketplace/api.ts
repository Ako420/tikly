import type { PillTone } from '@/components/ui/StatusPill';
import type { IconName } from '@/components/ui/Icon';
import { api, type Page } from '@/lib/http/client';

export type LocalizedText = Partial<Record<'en' | 'fr', string>>;

export type ServiceCategory = 'hall' | 'chairs' | 'canopy' | 'sound' | 'catering' | 'decoration' | 'other';
export type ServiceUnit = 'per_day' | 'per_item' | 'per_event';
export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'paid' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';

export type ServiceSummary = {
  id: string;
  providerId: string;
  category: ServiceCategory;
  title: LocalizedText;
  description?: string;
  photos: string[];
  city: string;
  price: number;
  unit: ServiceUnit;
  provider: { id: string; businessName: string; city: string; ratingAvg: number; ratingCount: number };
};

export type ServiceDetail = ServiceSummary & {
  provider: ServiceSummary['provider'] & {
    description?: string;
    country?: string;
    phone?: string;
    whatsapp?: string;
  };
};

export type Booking = {
  id: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  quantity: number;
  amount: number | null;
  note?: string;
  declineReason?: string;
  service: {
    id: string;
    category: ServiceCategory;
    title: LocalizedText;
    unit: ServiceUnit;
    price: number;
    photo: string | null;
  } | null;
  provider: { id: string; businessName: string; phone: string; whatsapp?: string } | null;
  event: { id: string; title: LocalizedText; startAt: string; city: string } | null;
  payment: { orderId: string; status: PaymentStatus } | null;
  createdAt: string;
};

export type PaymentOrder = {
  id: string;
  status: PaymentStatus;
  amount: number;
  payment?: { status: string; message?: string } | null;
};

export type ServiceQuery = {
  page: number;
  q?: string;
  category?: ServiceCategory;
  city?: string;
  maxPrice?: number;
};

export type CreateBookingInput = {
  serviceId: string;
  eventId?: string;
  startDate: string;
  endDate: string;
  quantity: number;
  note?: string;
};

export const marketplaceApi = {
  services: (query: ServiceQuery): Promise<Page<ServiceSummary>> =>
    api.page<ServiceSummary>('/services', { params: { limit: 12, ...query } }),
  service: (id: string) => api.get<ServiceDetail>(`/services/${id}`),
  book: (input: CreateBookingInput) => api.post<Booking>('/bookings', input),
  bookings: (query: { page: number; status?: BookingStatus }): Promise<Page<Booking>> =>
    api.page<Booking>('/bookings', { params: { limit: 20, ...query } }),
  booking: (id: string) => api.get<Booking>(`/bookings/${id}`),
  cancel: (id: string) => api.post<Booking>(`/bookings/${id}/cancel`),
  pay: (bookingId: string, phone: string, key: string) =>
    api.post<PaymentOrder>('/orders/bookings', { bookingId, phone }, { headers: { 'Idempotency-Key': key } }),
  order: (id: string) => api.get<PaymentOrder>(`/orders/${id}`),
  verify: (id: string) => api.post<PaymentOrder>(`/orders/${id}/verify`),
};

export const CATEGORIES: { key: ServiceCategory; label: string; icon: IconName }[] = [
  { key: 'hall', label: 'Halls', icon: 'hall' },
  { key: 'chairs', label: 'Chairs', icon: 'chairs' },
  { key: 'canopy', label: 'Canopies', icon: 'canopy' },
  { key: 'sound', label: 'Sound', icon: 'sound' },
  { key: 'catering', label: 'Catering', icon: 'catering' },
  { key: 'decoration', label: 'Decoration', icon: 'decoration' },
  { key: 'other', label: 'Other', icon: 'other' },
];

export const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  hall: 'Hall',
  chairs: 'Chairs',
  canopy: 'Canopy',
  sound: 'Sound',
  catering: 'Catering',
  decoration: 'Decoration',
  other: 'Other',
};

export const UNIT_LABEL: Record<ServiceUnit, string> = {
  per_day: 'per day',
  per_item: 'per item',
  per_event: 'per event',
};

export const BOOKING_STATUS_META: Record<BookingStatus, { label: string; tone: PillTone }> = {
  requested: { label: 'Requested', tone: 'info' },
  accepted: { label: 'Ready to pay', tone: 'warning' },
  paid: { label: 'Paid', tone: 'valid' },
  completed: { label: 'Completed', tone: 'neutral' },
  declined: { label: 'Declined', tone: 'invalid' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

export const serviceTitle = (text: LocalizedText | undefined) => text?.en ?? text?.fr ?? 'Service';

const DAY_MS = 86_400_000;

const calendarDay = (iso: string) => {
  const date = new Date(iso);
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
};

export const daysBetween = (start: string, end: string) =>
  Math.max(1, Math.round((calendarDay(end) - calendarDay(start)) / DAY_MS) + 1);

export const estimate = (price: number, unit: ServiceUnit, quantity: number, days: number) =>
  unit === 'per_event' ? price : unit === 'per_day' ? price * quantity * days : price * quantity;

export const whatsappLink = (phone: string) => `https://wa.me/${phone.replace(/\D/g, '')}`;

export const formatDay = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));

export const formatDayRange = (start: string, end: string) => {
  const a = new Date(start);
  const b = new Date(end);
  if (a.toDateString() === b.toDateString()) return formatDay(start);
  const sameMonth = a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
  const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric' });
  return sameMonth ? `${day.format(a)}–${formatDay(end)}` : `${formatDay(start)} – ${formatDay(end)}`;
};
