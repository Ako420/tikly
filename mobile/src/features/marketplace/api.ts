import type { ApiEvent } from '@/features/events/api';
import { api, http } from '@/lib/api';
import type { Booking, BookingStatus, Earnings, MyProvider, Service, ServiceCategory, ServiceDetail, ServiceListItem } from './types';

type Page<T> = { data: T[]; meta: { total: number; page: number; pages: number } };

export type ServiceQuery = { q?: string; category?: ServiceCategory; city?: string; maxPrice?: number; page?: number; limit?: number };

export const marketplaceApi = {
  services: async (params: ServiceQuery) => {
    const { data } = await http.get<Page<ServiceListItem>>('/services', { params, skipAuth: true });
    return { items: data.data, total: data.meta.total };
  },
  service: (id: string) => api.get<ServiceDetail>(`/services/${id}`),
  organizerEvents: () => api.get<ApiEvent[]>('/organizer/events', { params: { limit: 50 } }),
  bookings: (status?: BookingStatus) => api.get<Booking[]>('/bookings', { params: { limit: 50, ...(status && { status }) } }),
  requestBooking: (input: { serviceId: string; eventId?: string; startDate: string; endDate: string; quantity: number; note?: string }) =>
    api.post<Booking>('/bookings', input),
  acceptBooking: (id: string, amount: number) => api.post<Booking>(`/bookings/${id}/accept`, { amount }),
  declineBooking: (id: string, reason?: string) => api.post<Booking>(`/bookings/${id}/decline`, reason ? { reason } : {}),
  cancelBooking: (id: string) => api.post<Booking>(`/bookings/${id}/cancel`),
  myProvider: () => api.get<MyProvider>('/providers/me'),
  myServices: () => api.get<Service[]>('/providers/me/services', { params: { limit: 50 } }),
  earnings: (from?: string, to?: string) => api.get<Earnings>('/providers/me/earnings', { params: { from, to } }),
};
