import { sampleEvents, sampleUser } from '@/features/events/sampleEvents';
import type { TierName } from '@/features/events/types';
import type { CheckIn, GateEvent, LookupQuery, OtherEvent, ScanOutcome, ScannedTicket } from './types';

const HOUR = 60 * 60 * 1000;

export const sampleStaff = { name: 'Paul Ekwalla', organizerName: 'Sawa Events Collective' };

const topOfHour = (offsetHours: number) => {
  const date = new Date(Date.now() + offsetHours * HOUR);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
};

const event = (id: string) => {
  const found = sampleEvents.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown sample event ${id}`);
  return found;
};

const wouri = event('evt-wouri-festival');
const littoral = event('evt-littoral-cup');

const gateEvents: GateEvent[] = [
  {
    id: wouri.id,
    title: wouri.title,
    startAt: topOfHour(-1),
    endAt: topOfHour(8),
    scanningOpensAt: topOfHour(-3),
    venue: wouri.venue,
    area: 'Bonabéri',
    gate: 'Gate 2',
    organizerName: sampleStaff.organizerName,
    capacity: 3000,
    checkedIn: 1240,
    scannedByMe: 312,
  },
  {
    id: littoral.id,
    title: littoral.title,
    startAt: littoral.startAt,
    endAt: new Date(new Date(littoral.startAt).getTime() + 3 * HOUR).toISOString(),
    scanningOpensAt: new Date(new Date(littoral.startAt).getTime() - 2 * HOUR).toISOString(),
    venue: littoral.venue,
    area: 'Bépanda',
    gate: 'Gate A',
    organizerName: sampleStaff.organizerName,
    capacity: 12000,
    checkedIn: 0,
    scannedByMe: 0,
  },
];

type SampleTicket = ScannedTicket & { eventId: string; status: 'valid' | 'checked_in' | 'cancelled'; qrToken: string; buyerPhone: string };

const SAMPLE_BUYER_PHONE = '+237677123456';

const ticket = (
  id: string,
  eventId: string,
  code: string,
  tier: TierName,
  holderName: string,
  position?: ScannedTicket['position'],
  checkIns: CheckIn[] = [],
): SampleTicket => ({
  id,
  eventId,
  code,
  tier,
  holderName,
  position,
  checkIns,
  status: checkIns.length > 0 ? 'checked_in' : 'valid',
  qrToken: `${id}.${code}`,
  buyerPhone: holderName === sampleUser.name ? SAMPLE_BUYER_PHONE : '+237699001122',
});

const tickets: SampleTicket[] = [
  ticket('tb-wouri-t1', wouri.id, 'TK-WRF-7Q4M-21', 'vip', sampleUser.name, { index: 1, total: 2 }),
  ticket('tb-wouri-t2', wouri.id, 'TK-WRF-7Q4M-22', 'vip', sampleUser.name, { index: 2, total: 2 }),
  ticket('smp-wouri-std', wouri.id, 'TK-WRF-3H8D-07', 'standard', 'Brice Tchoua', undefined, [
    { at: topOfHour(-2), type: 'entry', staffName: 'Grace M.', gate: 'Gate 2' },
  ]),
  ticket('tb-littoral-t1', littoral.id, 'TK-LCF-9D2X-57', 'standard', sampleUser.name),
];

const otherEvents: Record<string, OtherEvent> = {
  [littoral.id]: { title: littoral.title, startAt: littoral.startAt, venue: 'Stade Réunification' },
};

const normalize = (value: string) => value.trim().toUpperCase().replace(/\s+/g, '');

const findTicket = (value: string) => {
  const raw = value.trim();
  const code = normalize(value);
  return tickets.find((item) => item.qrToken === raw || normalize(item.code) === code || item.id === raw);
};

const publicTicket = ({ id, code, tier, holderName, position, checkIns, status }: SampleTicket): ScannedTicket => ({
  status,
  id,
  code,
  tier,
  holderName,
  position,
  checkIns: [...checkIns],
});

let scanCounter = 0;
const nextId = () => `scan-${Date.now().toString(36)}-${(scanCounter += 1)}`;

export const sampleGate = {
  events: () => gateEvents,
  scan(eventId: string, value: string, staffName: string): ScanOutcome {
    const base = { id: nextId(), eventId, scannedAt: new Date().toISOString() };
    const found = findTicket(value);
    if (!found) return { ...base, result: 'INVALID' };
    if (found.eventId !== eventId) {
      return { ...base, result: 'WRONG_EVENT', ticket: publicTicket(found), otherEvent: otherEvents[found.eventId] };
    }
    if (found.status === 'cancelled') return { ...base, result: 'CANCELLED', ticket: publicTicket(found) };
    if (found.status === 'checked_in') return { ...base, result: 'ALREADY_CHECKED_IN', ticket: publicTicket(found) };

    const gateEvent = gateEvents.find((item) => item.id === eventId);
    found.status = 'checked_in';
    found.checkIns.push({ at: base.scannedAt, type: 'entry', staffName, gate: gateEvent?.gate });
    if (gateEvent) {
      gateEvent.checkedIn += 1;
      gateEvent.scannedByMe += 1;
    }
    return { ...base, result: 'VALID', ticket: publicTicket(found) };
  },
  lookup(eventId: string, query: LookupQuery): ScannedTicket[] {
    const matches = tickets.filter((item) =>
      item.eventId === eventId && ('code' in query ? normalize(item.code) === normalize(query.code) : item.buyerPhone === query.phone),
    );
    return matches.map(publicTicket);
  },
  reentry(ticketId: string, staffName: string) {
    const found = tickets.find((item) => item.id === ticketId);
    const gate = gateEvents.find((item) => item.id === found?.eventId)?.gate;
    found?.checkIns.push({ at: new Date().toISOString(), type: 'reentry', staffName, gate });
  },
};
