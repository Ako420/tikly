import { Types } from 'mongoose';
import { OrderModel, TicketModel, TicketTierModel, UserModel, type EventDoc } from '../model';
import type { LookupQuery, ReentryBody, ScanBody } from '../schema/access.schema';
import { AppError } from '../util/AppError';
import { verifyQrToken } from '../util/qrToken';

export type ScanResult = 'VALID' | 'ALREADY_CHECKED_IN' | 'INVALID' | 'WRONG_EVENT' | 'CANCELLED';

type TicketLike = {
  _id: Types.ObjectId;
  code: string;
  status: string;
  tierId?: Types.ObjectId | null;
  holderId?: Types.ObjectId | null;
  checkIns?: { at: Date; type?: string | null; note?: string | null; staffId?: Types.ObjectId | null }[] | null;
};

const LOOKUP_LIMIT = 20;

export function shortName(name: string) {
  const [first, ...rest] = name.trim().split(/\s+/);
  const last = rest.at(-1);
  return last ? `${first} ${last[0]!.toUpperCase()}.` : (first ?? '');
}

async function toScanViews(tickets: TicketLike[]) {
  const ids = (key: 'tierId' | 'holderId') => tickets.map((ticket) => ticket[key]).filter(Boolean);
  const staffIds = tickets
    .flatMap((ticket) => (ticket.checkIns ?? []).map((checkIn) => checkIn.staffId))
    .filter(Boolean);
  const [tiers, people] = await Promise.all([
    TicketTierModel.find({ _id: { $in: ids('tierId') } })
      .select('name')
      .lean(),
    UserModel.find({ _id: { $in: [...ids('holderId'), ...staffIds] } })
      .select('name')
      .lean(),
  ]);
  const tierName = new Map(tiers.map((tier) => [String(tier._id), tier.name]));
  const personName = new Map(people.map((person) => [String(person._id), person.name]));
  return tickets.map((ticket) => ({
    id: String(ticket._id),
    code: ticket.code,
    status: ticket.status,
    tier: tierName.get(String(ticket.tierId)) ?? null,
    holderName: shortName(personName.get(String(ticket.holderId)) ?? ''),
    checkIns: (ticket.checkIns ?? []).map((checkIn) => ({
      at: checkIn.at,
      type: checkIn.type ?? 'entry',
      note: checkIn.note ?? undefined,
      staffName: personName.get(String(checkIn.staffId)) ?? null,
    })),
  }));
}

const toScanView = async (ticket: TicketLike) => (await toScanViews([ticket]))[0]!;

async function resolveTicketId(input: ScanBody) {
  if (input.qrToken) return verifyQrToken(input.qrToken);
  const ticket = await TicketModel.findOne({ code: input.code }).select('_id').lean();
  return ticket ? String(ticket._id) : null;
}

export async function scan(staffId: string, event: EventDoc, input: ScanBody) {
  const ticketId = await resolveTicketId(input);
  if (!ticketId || !Types.ObjectId.isValid(ticketId)) return { result: 'INVALID' as ScanResult };

  const admitted = await TicketModel.findOneAndUpdate(
    { _id: ticketId, eventId: event._id, status: 'valid' },
    { status: 'checked_in', $push: { checkIns: { at: new Date(), staffId, type: 'entry' } } },
    { new: true },
  ).lean();
  if (admitted) return { result: 'VALID' as ScanResult, ticket: await toScanView(admitted) };

  const ticket = await TicketModel.findById(ticketId).lean();
  if (!ticket) return { result: 'INVALID' as ScanResult };
  if (!event._id.equals(ticket.eventId)) return { result: 'WRONG_EVENT' as ScanResult };
  if (ticket.status === 'checked_in') {
    return { result: 'ALREADY_CHECKED_IN' as ScanResult, ticket: await toScanView(ticket) };
  }
  return { result: 'CANCELLED' as ScanResult, ticket: await toScanView(ticket) };
}

export async function recordReentry(staffId: string, event: EventDoc, ticketId: string, input: ReentryBody) {
  const updated = await TicketModel.findOneAndUpdate(
    { _id: ticketId, eventId: event._id, status: 'checked_in' },
    { $push: { checkIns: { at: new Date(), staffId, type: 'reentry', ...(input.note && { note: input.note }) } } },
    { new: true },
  ).lean();
  if (updated) return toScanView(updated);

  const ticket = await TicketModel.findById(ticketId).select('eventId status').lean();
  if (!ticket || !event._id.equals(ticket.eventId)) throw AppError.notFound();
  if (ticket.status === 'valid') throw AppError.conflict('TICKET_NOT_CHECKED_IN');
  throw AppError.conflict('TICKET_NOT_VALID');
}

export async function lookup(event: EventDoc, query: LookupQuery) {
  const or: Record<string, unknown>[] = [];
  if (query.code) or.push({ code: query.code });
  if (query.phone) {
    const [holders, orders] = await Promise.all([
      UserModel.find({ phone: query.phone }).distinct('_id'),
      OrderModel.find({ eventId: event._id, phone: query.phone, status: 'paid' }).distinct('_id'),
    ]);
    if (holders.length) or.push({ holderId: { $in: holders } });
    if (orders.length) or.push({ orderId: { $in: orders } });
  }
  if (or.length === 0) return [];
  const tickets = await TicketModel.find({ eventId: event._id, $or: or }).sort({ code: 1 }).limit(LOOKUP_LIMIT).lean();
  return toScanViews(tickets);
}

export async function checkInCounts(event: EventDoc) {
  const [tiers, rows] = await Promise.all([
    TicketTierModel.find({ eventId: event._id }).sort({ price: 1 }).select('name sold').lean(),
    TicketModel.aggregate<{ _id: Types.ObjectId; checkedIn: number; reentries: number; last: Date | null }>([
      { $match: { eventId: event._id } },
      {
        $group: {
          _id: '$tierId',
          checkedIn: { $sum: { $cond: [{ $eq: ['$status', 'checked_in'] }, 1, 0] } },
          reentries: {
            $sum: { $size: { $filter: { input: '$checkIns', cond: { $eq: ['$$this.type', 'reentry'] } } } },
          },
          last: { $max: { $max: '$checkIns.at' } },
        },
      },
    ]),
  ]);
  const byTier = new Map(rows.map((row) => [String(row._id), row]));
  const perTier = tiers.map((tier) => ({
    id: String(tier._id),
    name: tier.name,
    sold: tier.sold,
    checkedIn: byTier.get(String(tier._id))?.checkedIn ?? 0,
    reentries: byTier.get(String(tier._id))?.reentries ?? 0,
  }));
  const lastTimes = rows.map((row) => row.last).filter((value): value is Date => value instanceof Date);
  return {
    tiers: perTier,
    totals: {
      sold: perTier.reduce((sum, tier) => sum + tier.sold, 0),
      checkedIn: perTier.reduce((sum, tier) => sum + tier.checkedIn, 0),
      reentries: perTier.reduce((sum, tier) => sum + tier.reentries, 0),
    },
    lastCheckInAt: lastTimes.length ? new Date(Math.max(...lastTimes.map((date) => date.getTime()))) : null,
    generatedAt: new Date(),
  };
}
