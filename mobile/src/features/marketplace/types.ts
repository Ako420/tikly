import type { LocalizedText } from '@/features/events/types';

export const SERVICE_CATEGORIES = ['hall', 'chairs', 'canopy', 'sound', 'catering', 'decoration', 'other'] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];
export type ServiceUnit = 'per_day' | 'per_item' | 'per_event';
export type BookingStatus = 'requested' | 'accepted' | 'declined' | 'paid' | 'completed' | 'cancelled';

export type ProviderSummary = {
  id: string;
  businessName: string;
  city: string;
  ratingAvg: number;
  ratingCount: number;
};

export type ProviderContact = ProviderSummary & {
  description?: string;
  country: string;
  phone: string;
  whatsapp?: string;
};

export type Service = {
  id: string;
  providerId: string;
  category: ServiceCategory;
  title: LocalizedText;
  description?: string;
  photos: string[];
  city: string;
  price: number;
  unit: ServiceUnit;
  active: boolean;
};

export type ServiceListItem = Service & { provider: ProviderSummary | null };
export type ServiceDetail = Service & { provider: ProviderContact };

export type Booking = {
  id: string;
  status: BookingStatus;
  startDate: string;
  endDate: string;
  quantity: number;
  amount: number | null;
  note?: string;
  declineReason?: string;
  service: { id: string; category: ServiceCategory; title: LocalizedText; unit: ServiceUnit; price: number; photo: string | null } | null;
  provider: { id: string; businessName: string; phone: string; whatsapp?: string } | null;
  organizer: { id: string; name: string; phone: string } | null;
  event: { id: string; title: LocalizedText; startAt: string; city: string } | null;
  payment: { orderId: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type MyProvider = ProviderContact & {
  verification: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
};

export type Earnings = {
  paidBookings: number;
  gross: number;
  commission: number;
  net: number;
  refunded: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export const bookingDays = (startDate: string, endDate: string) =>
  Math.max(1, Math.round((new Date(endDate).setHours(0, 0, 0, 0) - new Date(startDate).setHours(0, 0, 0, 0)) / DAY_MS) + 1);

export const estimateBooking = (price: number, unit: ServiceUnit, quantity: number, days: number) =>
  unit === 'per_day' ? price * quantity * days : price * quantity;
