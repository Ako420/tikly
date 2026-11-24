import { getSampleEventDetails } from '@/features/events/sampleEventDetails';
import { sampleEvents, sampleUser } from '@/features/events/sampleEvents';
import type { EventDetails, EventSummary } from '@/features/events/types';
import type { IssuedTicket } from '@/features/orders/types';
import { activeTickets, refundFor, type TicketBundle, type TicketEvent } from './types';

export const toTicketEvent = (event: EventSummary | EventDetails): TicketEvent => ({
  id: event.id,
  title: event.title,
  startAt: event.startAt,
  endAt: 'endAt' in event ? event.endAt : undefined,
  venue: event.venue,
  city: event.city,
  coverUrl: event.coverUrl,
  entrance: 'address' in event ? event.address.pin : undefined,
});

const sampleEvent = (id: string) => {
  const details = getSampleEventDetails(id);
  if (details) return toTicketEvent(details);
  const summary = sampleEvents.find((event) => event.id === id);
  if (!summary) throw new Error(`Unknown sample event ${id}`);
  return toTicketEvent(summary);
};

const SAMPLE_PAYMENT = { method: 'mtn' as const, phone: '+237677123456' };

const coverOf = (id: string) => sampleEvents.find((event) => event.id === id)?.coverUrl;

const sampleTickets = (bundleId: string, codes: string[], status?: IssuedTicket['status']): IssuedTicket[] =>
  codes.map((code, index) => ({
    id: `${bundleId}-t${index + 1}`,
    code,
    qrToken: `${bundleId}-t${index + 1}.${code}`,
    holderName: sampleUser.name,
    status,
  }));

type SampleBundleInput = Omit<TicketBundle, 'tickets' | 'payment'> & { codes: string[]; status?: IssuedTicket['status'] };

const sampleBundle = ({ codes, status, ...bundle }: SampleBundleInput): TicketBundle => ({
  ...bundle,
  payment: SAMPLE_PAYMENT,
  tickets: sampleTickets(bundle.id, codes, status),
});

const pastEvent = (id: string, title: string, startAt: string, venue: string, coverUrl?: string): TicketEvent => ({
  id,
  title: { en: title, fr: title },
  startAt,
  endAt: new Date(new Date(startAt).getTime() + 4 * 60 * 60 * 1000).toISOString(),
  venue,
  city: 'Douala',
  coverUrl,
});

const seed = (): TicketBundle[] => [
  sampleBundle({
    id: 'tb-comedy',
    event: sampleEvent('evt-comedy-night'),
    tierName: 'standard',
    unitPrice: 5000,
    codes: ['TK-RAD-3K8P-04'],
    purchasedAt: '2026-11-02T10:12:00+01:00',
  }),
  sampleBundle({
    id: 'tb-wouri',
    event: sampleEvent('evt-wouri-festival'),
    tierName: 'vip',
    unitPrice: 10000,
    codes: ['TK-WRF-7Q4M-21', 'TK-WRF-7Q4M-22'],
    purchasedAt: '2026-11-10T18:40:00+01:00',
  }),
  sampleBundle({
    id: 'tb-littoral',
    event: sampleEvent('evt-littoral-cup'),
    tierName: 'standard',
    unitPrice: 1500,
    codes: ['TK-LCF-9D2X-57'],
    purchasedAt: '2026-11-15T08:05:00+01:00',
  }),
  sampleBundle({
    id: 'tb-ndolo',
    event: pastEvent('evt-ndolo-comedy', 'Ndolo Comedy Fest', '2026-11-09T19:00:00+01:00', 'Salle des Fêtes d’Akwa', coverOf('evt-comedy-night')),
    tierName: 'standard',
    unitPrice: 4000,
    codes: ['TK-NCF-5R2D-31', 'TK-NCF-5R2D-32'],
    status: 'checked_in',
    checkedInAt: '2026-11-09T19:42:00+01:00',
    purchasedAt: '2026-10-28T09:30:00+01:00',
  }),
  sampleBundle({
    id: 'tb-tech-summit',
    event: pastEvent('evt-tech-summit', 'Yaoundé Tech Summit', '2026-10-26T09:00:00+01:00', 'Palais des Congrès', coverOf('evt-business-expo')),
    tierName: 'vip',
    unitPrice: 15000,
    codes: ['TK-YTS-8M3K-07'],
    status: 'checked_in',
    checkedInAt: '2026-10-26T08:51:00+01:00',
    review: { rating: 4 },
    purchasedAt: '2026-10-10T14:20:00+01:00',
  }),
  sampleBundle({
    id: 'tb-jazz-brunch',
    event: pastEvent('evt-jazz-brunch', 'Afro Jazz Brunch', '2026-11-17T11:00:00+01:00', 'Bonapriso'),
    tierName: 'standard',
    unitPrice: 6000,
    codes: ['TK-AJB-4T9W-02'],
    status: 'refunded',
    cancellation: { by: 'organizer', refundAmount: 6000 },
    purchasedAt: '2026-11-01T16:45:00+01:00',
  }),
];

let bundles = seed();
const listeners = new Set<() => void>();

const update = (id: string, change: (bundle: TicketBundle) => TicketBundle) => {
  bundles = bundles.map((bundle) => (bundle.id === id ? change(bundle) : bundle));
  listeners.forEach((listener) => listener());
};

export const ticketWallet = {
  list: () => bundles,
  get: (id: string) => bundles.find((bundle) => bundle.id === id),
  add(bundle: TicketBundle) {
    if (bundles.some((item) => item.id === bundle.id)) return;
    bundles = [bundle, ...bundles];
    listeners.forEach((listener) => listener());
  },
  cancelTickets(bundleId: string, ticketIds: string[]) {
    update(bundleId, (bundle) => {
      const tickets = bundle.tickets.map((ticket) => (ticketIds.includes(ticket.id) ? { ...ticket, status: 'refunded' as const } : ticket));
      const next = { ...bundle, tickets };
      if (activeTickets(next).length > 0) return next;
      const refunded = tickets.filter((ticket) => ticket.status === 'refunded').length;
      return { ...next, cancellation: { by: 'attendee', refundAmount: refundFor(bundle.unitPrice ?? 0) * refunded } };
    });
  },
  setReview(bundleId: string, rating: number) {
    update(bundleId, (bundle) => ({ ...bundle, review: { rating } }));
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  sampleEvent,
};
