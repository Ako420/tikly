import { api, type Page } from '@/lib/http/client';

export type LocalizedText = Partial<Record<'en' | 'fr', string>>;

export type EventStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'cancelled' | 'completed' | 'suspended';

export type OrganizerEvent = {
  id: string;
  title: LocalizedText;
  category: string;
  coverUrl?: string;
  venue: string;
  city: string;
  startAt: string;
  endAt: string;
  status: EventStatus;
  rejectionReason?: string;
  updatedAt: string;
};

export type Tier = { id: string; name: string; price: number; quantity: number; available: number };

export type TierStat = Tier & { sold: number; reserved: number; checkedIn: number };

export type EventStats = {
  tiers: TierStat[];
  totals: { ticketsSold: number; checkedIn: number; gross: number; commission: number; net: number; refunded: number };
};

export type WorkspaceCounts = {
  budget?: { planned: number; actual: number };
  checklist?: { total: number; done: number };
  agenda?: number;
  slots?: { booked: number; total: number };
  staff?: number;
};

const settle = <T,>(promise: Promise<T>) => promise.then((value) => value, () => undefined);

export const organizerApi = {
  events: () => api.get<OrganizerEvent[]>('/organizer/events', { params: { limit: 100 } }),
  event: (id: string) => api.get<OrganizerEvent>(`/events/${id}`),
  stats: (id: string) => api.get<EventStats>(`/events/${id}/stats`),
  workspace: async (eventId: string): Promise<WorkspaceCounts> => {
    const [budget, checklist, agenda, slots, staff] = await Promise.all([
      settle(api.get<{ totals: { planned: number; actual: number } }>(`/events/${eventId}/budget`)),
      settle(api.get<{ items: { done: boolean }[] }>(`/events/${eventId}/checklist`)),
      settle(api.get<unknown[]>(`/events/${eventId}/agenda`)),
      settle(api.get<{ quantity: number; available: number }[]>(`/events/${eventId}/slots`)),
      settle(api.get<{ events: { id: string }[] }[]>('/organizer/staff')),
    ]);
    return {
      budget: budget?.totals,
      checklist: checklist && { total: checklist.items.length, done: checklist.items.filter((item) => item.done).length },
      agenda: agenda?.length,
      slots: slots && {
        total: slots.reduce((sum, slot) => sum + slot.quantity, 0),
        booked: slots.reduce((sum, slot) => sum + slot.quantity - slot.available, 0),
      },
      staff: staff?.filter((member) => member.events.some((event) => event.id === eventId)).length,
    };
  },
};

export const localize = (text: LocalizedText) => text.en ?? text.fr ?? '';

export const STATUS_META: Record<EventStatus, { label: string; tone: 'valid' | 'warning' | 'invalid' | 'neutral' }> = {
  published: { label: 'Published', tone: 'valid' },
  pending: { label: 'Pending approval', tone: 'warning' },
  rejected: { label: 'Rejected', tone: 'invalid' },
  draft: { label: 'Draft', tone: 'neutral' },
  cancelled: { label: 'Cancelled', tone: 'invalid' },
  completed: { label: 'Completed', tone: 'neutral' },
  suspended: { label: 'Suspended', tone: 'invalid' },
};

const DAY_MS = 86_400_000;
export const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / DAY_MS);

export const formatDateRange = (startAt: string, endAt: string) => {
  const start = new Date(startAt);
  const end = new Date(endAt);
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  return start.toDateString() === end.toDateString() ? day.format(start) : `${day.format(start)} – ${day.format(end)}`;
};

export type EventWithStats = OrganizerEvent & { stats: EventStats | null };

export const loadEventsWithStats = async (): Promise<EventWithStats[]> => {
  const events = await organizerApi.events();
  return Promise.all(
    events.map(async (event) => ({
      ...event,
      stats: ['published', 'completed', 'cancelled', 'suspended'].includes(event.status)
        ? await organizerApi.stats(event.id).catch(() => null)
        : null,
    })),
  );
};

export const capacityOf = (stats: EventStats | null) => stats?.tiers.reduce((sum, tier) => sum + tier.quantity, 0) ?? 0;

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const formatShortDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(iso));

export type Category = { key: string; en: string; fr: string };
export type TierName = 'standard' | 'vip' | 'vvip';

export type CreateEventInput = {
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

export type CreateTierInput = { name: TierName; price: number; quantity: number; salesEndAt: string };

export const eventDraftApi = {
  categories: () => api.get<Category[]>('/categories'),
  uploadCover: (file: File) => api.upload<{ url: string }>('/uploads/image', file),
  create: (input: CreateEventInput) => api.post<OrganizerEvent>('/events', input),
  addTier: (eventId: string, input: CreateTierInput) => api.post<Tier>(`/events/${eventId}/tiers`, input),
  submit: (eventId: string) => api.post<OrganizerEvent>(`/events/${eventId}/submit`),
};

export type OrderStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
export type TicketStatus = 'valid' | 'checked_in' | 'cancelled' | 'refunded';
export type SalesPerson = { id: string; name: string; email?: string; phone?: string };

export type EventOrder = {
  id: string;
  buyer: SalesPerson;
  phone?: string;
  amount: number;
  status: OrderStatus;
  tickets: number;
  items: { tier: TierName; quantity: number; unitPrice: number }[];
  createdAt: string;
  paidAt?: string;
};

export type EventAttendee = {
  id: string;
  code: string;
  tier: TierName;
  holder: SalesPerson;
  orderId: string;
  status: TicketStatus;
  checkedInAt?: string;
  reentries: number;
  createdAt: string;
};

export type SalesQuery = { page: number; status?: string; q?: string; tierId?: string };

export const salesApi = {
  orders: (eventId: string, query: SalesQuery): Promise<Page<EventOrder>> =>
    api.page<EventOrder>(`/events/${eventId}/orders`, { params: { limit: 20, ...query } }),
  attendees: (eventId: string, query: SalesQuery): Promise<Page<EventAttendee>> =>
    api.page<EventAttendee>(`/events/${eventId}/attendees`, { params: { limit: 20, ...query } }),
};

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; tone: 'valid' | 'warning' | 'invalid' | 'neutral' }> = {
  paid: { label: 'Paid', tone: 'valid' },
  pending: { label: 'Awaiting payment', tone: 'warning' },
  failed: { label: 'Failed', tone: 'invalid' },
  expired: { label: 'Expired', tone: 'neutral' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export const TICKET_STATUS_META: Record<TicketStatus, { label: string; tone: 'valid' | 'warning' | 'invalid' | 'neutral' }> = {
  valid: { label: 'Not checked in', tone: 'neutral' },
  checked_in: { label: 'Checked in', tone: 'valid' },
  cancelled: { label: 'Cancelled', tone: 'invalid' },
  refunded: { label: 'Refunded', tone: 'neutral' },
};

export const TIER_LABEL: Record<TierName, string> = { standard: 'Standard', vip: 'VIP', vvip: 'VVIP' };
