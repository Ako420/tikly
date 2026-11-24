import type { FilterQuery, Types } from 'mongoose';
import { env } from '../config/env';
import { PUBLISHED_EDITABLE_EVENT_FIELDS } from '../config/constants';
import { withTransaction } from '../lib/transaction';
import {
  AgendaItemModel,
  BudgetItemModel,
  ChecklistItemModel,
  EventModel,
  GuestModel,
  OrderModel,
  SlotBookingModel,
  SlotModel,
  StaffAssignmentModel,
  TicketModel,
  TicketTierModel,
  TransactionModel,
  type Event,
  type EventDoc,
} from '../model';
import type { CreateEventBody, ListEventsQuery, OrganizerEventsQuery, UpdateEventBody } from '../schema/event.schema';
import type { EventStatus, Language, Role } from '../types/enums';
import { AppError } from '../util/AppError';
import { skipFor } from '../util/pagination';
import { exactInsensitive } from '../util/regex';
import { notifyAdmins, notifyUsers } from './notification.service';
import { assertCategory } from './setting.service';

type Viewer = { id: string; role: Role } | undefined;
type TierLike = {
  _id: Types.ObjectId;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  reserved: number;
  salesEndAt: Date;
};

const PUBLIC_STATUSES: EventStatus[] = ['published', 'completed'];
const EDITABLE_STATUSES: EventStatus[] = ['draft', 'rejected'];
const BILINGUAL_FIELDS = ['title', 'description'] as const;

const available = (tier: TierLike) => Math.max(0, tier.quantity - tier.sold - tier.reserved);

function toTierView(tier: TierLike, now = new Date()) {
  const left = available(tier);
  return {
    id: String(tier._id),
    name: tier.name,
    price: tier.price,
    quantity: tier.quantity,
    available: left,
    salesEndAt: tier.salesEndAt,
    onSale: left > 0 && tier.salesEndAt > now,
  };
}

const titleIn = (event: { title?: { en?: string | null; fr?: string | null } | null }, lang: Language) =>
  (lang === 'fr' ? event.title?.fr || event.title?.en : event.title?.en || event.title?.fr) ?? '';

const isVisibleTo = (event: EventDoc, viewer: Viewer) =>
  PUBLIC_STATUSES.includes(event.status as EventStatus) ||
  viewer?.role === 'admin' ||
  (viewer !== undefined && String(event.organizerId) === viewer.id);

async function findVisible(eventId: string, viewer: Viewer) {
  const event = await EventModel.findById(eventId);
  if (!event || !isVisibleTo(event, viewer)) throw AppError.notFound();
  return event;
}

export async function createEvent(organizerId: string, input: CreateEventBody) {
  await assertCategory(input.category);
  return EventModel.create({ ...input, organizerId, status: 'draft' });
}

export async function updateEvent(event: EventDoc, input: UpdateEventBody) {
  const fields = (Object.keys(input) as (keyof UpdateEventBody)[]).filter((field) => input[field] !== undefined);
  const status = event.status as EventStatus;

  if (status === 'published') {
    const locked = fields.filter((field) => !(PUBLISHED_EDITABLE_EVENT_FIELDS as readonly string[]).includes(field));
    if (locked.length) throw AppError.conflict('EVENT_NOT_EDITABLE', { fields: locked });
  } else if (!EDITABLE_STATUSES.includes(status)) {
    throw AppError.conflict('EVENT_NOT_EDITABLE');
  }

  if (input.category) await assertCategory(input.category);

  for (const field of fields) {
    const value = input[field];
    if ((BILINGUAL_FIELDS as readonly string[]).includes(field)) {
      const text = value as { en?: string; fr?: string };
      for (const lang of ['en', 'fr'] as const) {
        if (text[lang] !== undefined) event.set(`${field}.${lang}`, text[lang]);
      }
    } else {
      event.set(field, value);
    }
  }

  if (input.startAt) {
    const late = await TicketTierModel.exists({ eventId: event._id, salesEndAt: { $gt: input.startAt } });
    if (late) throw AppError.badRequest('TIER_SALES_END_AFTER_START');
  }
  if (status === 'rejected') event.status = 'draft';
  await event.save();
  return event;
}

export async function deleteEvent(event: EventDoc) {
  if (event.status !== 'draft') throw AppError.conflict('EVENT_NOT_EDITABLE');
  await withTransaction(async (session) => {
    const byEvent = { eventId: event._id };
    const slotIds = await SlotModel.find(byEvent).session(session).distinct('_id');
    await Promise.all([
      TicketTierModel.deleteMany(byEvent, { session }),
      AgendaItemModel.deleteMany(byEvent, { session }),
      ChecklistItemModel.deleteMany(byEvent, { session }),
      BudgetItemModel.deleteMany(byEvent, { session }),
      GuestModel.deleteMany(byEvent, { session }),
      StaffAssignmentModel.deleteMany(byEvent, { session }),
      SlotBookingModel.deleteMany({ slotId: { $in: slotIds } }, { session }),
      SlotModel.deleteMany(byEvent, { session }),
    ]);
    await EventModel.deleteOne({ _id: event._id }, { session });
  });
}

export async function submitForApproval(event: EventDoc) {
  if (!EDITABLE_STATUSES.includes(event.status as EventStatus)) throw AppError.conflict('EVENT_NOT_EDITABLE');
  if (event.startAt <= new Date()) throw AppError.badRequest('EVENT_ALREADY_STARTED');
  const tiers = await TicketTierModel.countDocuments({ eventId: event._id });
  if (tiers === 0) throw AppError.badRequest('EVENT_NEEDS_TIERS');
  event.status = 'pending';
  event.rejectionReason = undefined;
  await event.save();
  await notifyAdmins('event_pending', { eventId: event.id, title: titleIn(event, 'en') }, event.id);
  return event;
}

export async function cancelEvent(event: EventDoc, reason: string) {
  if (event.status !== 'published' || event.endAt <= new Date()) throw AppError.conflict('EVENT_NOT_CANCELLABLE');
  event.status = 'cancelled';
  event.cancellationReason = reason;
  await event.save();
  const holders = await TicketModel.distinct('holderId', {
    eventId: event._id,
    status: { $in: ['valid', 'checked_in'] },
  });
  await notifyUsers(
    holders.map(String),
    'event_cancelled',
    { eventId: event.id, title: titleIn(event, 'en'), reason },
    event.id,
  );
  return event;
}

async function lowestPrices(eventIds: Types.ObjectId[]) {
  const rows = await TicketTierModel.aggregate<{ _id: Types.ObjectId; priceFrom: number }>([
    { $match: { eventId: { $in: eventIds } } },
    { $group: { _id: '$eventId', priceFrom: { $min: '$price' } } },
  ]);
  return new Map(rows.map((row) => [String(row._id), row.priceFrom]));
}

export async function listPublicEvents(query: ListEventsQuery) {
  const startAt: { $gte: Date; $lte?: Date } = { $gte: query.from ?? new Date() };
  if (query.to) startAt.$lte = query.to;
  const filter: FilterQuery<Event> = { status: 'published', startAt };
  if (query.city) filter.city = exactInsensitive(query.city);
  if (query.country) filter.country = exactInsensitive(query.country);
  if (query.category) filter.category = query.category;
  if (query.q) filter.$text = { $search: query.q };

  const [events, total] = await Promise.all([
    EventModel.find(filter).sort({ startAt: 1, _id: 1 }).skip(skipFor(query)).limit(query.limit),
    EventModel.countDocuments(filter),
  ]);
  const prices = await lowestPrices(events.map((event) => event._id));
  const items = events.map((event) => ({ ...event.toJSON(), priceFrom: prices.get(event.id) ?? null }));
  return { items, total };
}

export async function listOrganizerEvents(organizerId: string, query: OrganizerEventsQuery) {
  const filter: FilterQuery<Event> = { organizerId, ...(query.status && { status: query.status }) };
  const [items, total] = await Promise.all([
    EventModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(query)).limit(query.limit),
    EventModel.countDocuments(filter),
  ]);
  return { items, total };
}

async function exhibitorsOf(eventId: Types.ObjectId) {
  const slots = await SlotModel.find({ eventId }).select('label').lean();
  if (slots.length === 0) return [];
  const labels = new Map(slots.map((slot) => [String(slot._id), slot.label]));
  const bookings = await SlotBookingModel.find({ slotId: { $in: [...labels.keys()] }, status: 'paid' })
    .populate<{ exhibitorId: { _id: Types.ObjectId; name: string } | null }>('exhibitorId', 'name')
    .lean();
  return bookings
    .filter((booking) => booking.exhibitorId)
    .map((booking) => ({
      name: booking.exhibitorId!.name,
      slot: labels.get(String(booking.slotId)) ?? '',
      quantity: booking.quantity,
    }));
}

export async function getEventDetails(eventId: string, viewer: Viewer) {
  const event = await findVisible(eventId, viewer);
  const [tiers, agenda, exhibitors] = await Promise.all([
    TicketTierModel.find({ eventId: event._id }).sort({ price: 1 }).lean(),
    AgendaItemModel.find({ eventId: event._id }).sort({ startAt: 1 }),
    exhibitorsOf(event._id),
  ]);
  const now = new Date();
  return {
    ...event.toJSON(),
    tiers: tiers.map((tier) => toTierView(tier, now)),
    agenda: agenda.map((item) => item.toJSON()),
    exhibitors,
  };
}

export async function getEventStats(event: EventDoc) {
  const eventId = event._id;
  const [tiers, checkIns, orderIds] = await Promise.all([
    TicketTierModel.find({ eventId }).sort({ price: 1 }).lean(),
    TicketModel.aggregate<{ _id: Types.ObjectId; count: number }>([
      { $match: { eventId, status: 'checked_in' } },
      { $group: { _id: '$tierId', count: { $sum: 1 } } },
    ]),
    OrderModel.find({ eventId, type: 'ticket' }).distinct('_id'),
  ]);
  const money = await TransactionModel.aggregate<{
    _id: 'payment' | 'refund';
    amount: number;
    commission: number;
    payeeShare: number;
  }>([
    { $match: { orderId: { $in: orderIds }, status: 'successful' } },
    {
      $group: {
        _id: '$kind',
        amount: { $sum: '$amount' },
        commission: { $sum: '$commission' },
        payeeShare: { $sum: '$payeeShare' },
      },
    },
  ]);

  const checkedIn = new Map(checkIns.map((row) => [String(row._id), row.count]));
  const payments = money.find((row) => row._id === 'payment');
  const refunds = money.find((row) => row._id === 'refund');
  const tierStats = tiers.map((tier) => ({
    ...toTierView(tier),
    sold: tier.sold,
    reserved: tier.reserved,
    checkedIn: checkedIn.get(String(tier._id)) ?? 0,
  }));

  return {
    tiers: tierStats,
    totals: {
      ticketsSold: tierStats.reduce((sum, tier) => sum + tier.sold, 0),
      checkedIn: tierStats.reduce((sum, tier) => sum + tier.checkedIn, 0),
      gross: payments?.amount ?? 0,
      commission: payments?.commission ?? 0,
      net: payments?.payeeShare ?? 0,
      refunded: refunds?.amount ?? 0,
    },
  };
}

export async function getShareLinks(eventId: string, lang: Language) {
  const event = await findVisible(eventId, undefined);
  const url = `${env.APP_WEB_URL}/events/${event.id}`;
  const message = `${titleIn(event, lang)} ${url}`.trim();
  return {
    url,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(message)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  };
}
