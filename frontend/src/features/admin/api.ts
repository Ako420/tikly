import type { EventStatus, LocalizedText } from '@/features/organizer/api';
import { api, type Page } from '@/lib/http/client';

export type Stream = 'ticket' | 'service' | 'slot';
export type UserRole = 'attendee' | 'organizer' | 'provider' | 'exhibitor' | 'staff' | 'admin';

export type StreamTotals = { payments: number; gross: number; commission: number; payees: number; refunded: number };

export type AdminStats = {
  from: string | null;
  to: string | null;
  users: Record<UserRole, number> & { total: number };
  events: Record<EventStatus, number> & { total: number };
  ticketsSold: number;
  revenue: Record<Stream, StreamTotals> & { total: { gross: number; commission: number; refunded: number } };
};

export type AdminSettings = {
  commission: Record<Stream, number>;
  categories: { key: string; en: string; fr: string }[];
};

export type PendingEvent = {
  id: string;
  title: LocalizedText;
  category: string;
  coverUrl?: string;
  city: string;
  startAt: string;
  createdAt: string;
  updatedAt: string;
  organizer: { id: string; name: string; email?: string; phone?: string } | null;
};

export type PendingProvider = {
  id: string;
  businessName: string;
  city: string;
  documents: string[];
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string } | null;
};

export const adminApi = {
  stats: (range: { from?: string; to?: string }) => api.get<AdminStats>('/admin/stats', { params: range }),
  settings: () => api.get<AdminSettings>('/admin/settings'),
  pendingEvents: (limit = 5): Promise<Page<PendingEvent>> =>
    api.page<PendingEvent>('/admin/events', { params: { status: 'pending', limit } }),
  pendingProviders: (limit = 5): Promise<Page<PendingProvider>> =>
    api.page<PendingProvider>('/admin/providers', { params: { verification: 'pending', limit } }),
};

export const STREAM_LABEL: Record<Stream, string> = {
  ticket: 'Ticket sales',
  service: 'Service bookings',
  slot: 'Exhibitor slots',
};

export const ROLE_LABEL: Record<UserRole, string> = {
  attendee: 'Attendees',
  organizer: 'Organizers',
  provider: 'Service providers',
  exhibitor: 'Exhibitors',
  staff: 'Gate staff',
  admin: 'Admins',
};

export const waitingSince = (iso: string, now: number) => {
  const hours = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 3_600_000));
  if (hours < 1) return 'under 1 h';
  if (hours < 48) return `${hours} h`;
  return `${Math.floor(hours / 24)} days`;
};
