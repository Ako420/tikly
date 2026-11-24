import { getSampleEventDetails } from '@/features/events/sampleEventDetails';
import { sampleEvents, sampleUser } from '@/features/events/sampleEvents';
import type { EventDetails, EventSummary, TierName } from '@/features/events/types';
import type { IssuedTicket } from '@/features/orders/types';
import type { TicketBundle, TicketEvent } from './types';

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

const sampleTickets = (bundleId: string, codes: string[]): IssuedTicket[] =>
  codes.map((code, index) => ({
    id: `${bundleId}-t${index + 1}`,
    code,
    qrToken: `${bundleId}-t${index + 1}.${code}`,
    holderName: sampleUser.name,
  }));

const sampleBundle = (id: string, event: TicketEvent, tierName: TierName, codes: string[], purchasedAt: string): TicketBundle => ({
  id,
  event,
  tierName,
  tickets: sampleTickets(id, codes),
  purchasedAt,
});

const seed = (): TicketBundle[] => [
  sampleBundle('tb-comedy', sampleEvent('evt-comedy-night'), 'standard', ['TK-RAD-3K8P-04'], '2026-11-02T10:12:00+01:00'),
  sampleBundle('tb-wouri', sampleEvent('evt-wouri-festival'), 'vip', ['TK-WRF-7Q4M-21', 'TK-WRF-7Q4M-22'], '2026-11-10T18:40:00+01:00'),
  sampleBundle('tb-littoral', sampleEvent('evt-littoral-cup'), 'standard', ['TK-LCF-9D2X-57'], '2026-11-15T08:05:00+01:00'),
  sampleBundle(
    'tb-jazz',
    {
      id: 'evt-jazz-sessions',
      title: { en: 'Douala Jazz Sessions', fr: 'Douala Jazz Sessions' },
      startAt: '2026-10-17T19:30:00+01:00',
      endAt: '2026-10-17T23:30:00+01:00',
      venue: 'Institut Français',
      city: 'Douala',
      coverUrl: sampleEvents[0]?.coverUrl,
      entrance: 'Main hall',
    },
    'standard',
    ['TK-DJS-2H6T-11'],
    '2026-10-01T12:00:00+01:00',
  ),
];

let bundles = seed();
const listeners = new Set<() => void>();

export const ticketWallet = {
  list: () => bundles,
  get: (id: string) => bundles.find((bundle) => bundle.id === id),
  add(bundle: TicketBundle) {
    if (bundles.some((item) => item.id === bundle.id)) return;
    bundles = [bundle, ...bundles];
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  sampleEvent,
};
