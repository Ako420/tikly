import type { Document, FilterQuery, Model, Types } from 'mongoose';
import {
  AgendaItemModel,
  BookingModel,
  BudgetItemModel,
  ChecklistItemModel,
  EventModel,
  GuestModel,
  OrderModel,
  TicketModel,
  TicketTierModel,
  TransactionModel,
  UserModel,
  type EventDoc,
  type Guest,
} from '../model';
import type {
  CreateAgendaItemBody,
  CreateBudgetItemBody,
  CreateChecklistItemBody,
  CreateGuestBody,
  ListGuestsQuery,
  UpdateAgendaItemBody,
  UpdateBudgetItemBody,
  UpdateChecklistItemBody,
  UpdateGuestBody,
} from '../schema/planning.schema';
import type { EventStatus, Role, TierName } from '../types/enums';
import { AppError } from '../util/AppError';
import { skipFor } from '../util/pagination';
import { escapeRegex } from '../util/regex';

type Viewer = { id: string; role: Role } | undefined;
type Changes = Record<string, unknown>;

const LINKABLE_BOOKING_STATUSES = ['accepted', 'paid', 'completed'];
const PAID_BOOKING_STATUSES = ['paid', 'completed'];
const TIER_RANK: Record<TierName, number> = { standard: 0, vip: 1, vvip: 2 };
const PUBLIC_STATUSES: EventStatus[] = ['published', 'completed'];

function applyChanges(doc: Document, changes: Changes) {
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined) continue;
    doc.set(key, value === null ? undefined : value);
  }
}

async function findItem<T>(model: Model<T>, event: EventDoc, id: string) {
  const item = await model.findOne({ _id: id, eventId: event._id } as FilterQuery<T>);
  if (!item) throw AppError.notFound();
  return item;
}

async function removeItem<T>(model: Model<T>, event: EventDoc, id: string) {
  const { deletedCount } = await model.deleteOne({ _id: id, eventId: event._id } as FilterQuery<T>);
  if (deletedCount === 0) throw AppError.notFound();
}

async function eventIncome(eventId: Types.ObjectId) {
  const orders = await OrderModel.find({ eventId, type: { $in: ['ticket', 'slot'] }, status: 'paid' })
    .select('type')
    .lean();
  const typeOf = new Map(orders.map((order) => [String(order._id), order.type]));
  const rows = await TransactionModel.aggregate<{ _id: Types.ObjectId; payeeShare: number }>([
    { $match: { orderId: { $in: orders.map((order) => order._id) }, kind: 'payment', status: 'successful' } },
    { $group: { _id: '$orderId', payeeShare: { $sum: '$payeeShare' } } },
  ]);
  const income = { tickets: 0, slots: 0 };
  for (const row of rows) {
    if (typeOf.get(String(row._id)) === 'slot') income.slots += row.payeeShare;
    else income.tickets += row.payeeShare;
  }
  return income;
}

export async function getBudget(event: EventDoc) {
  const [items, income] = await Promise.all([
    BudgetItemModel.find({ eventId: event._id }).sort({ createdAt: 1, _id: 1 }),
    eventIncome(event._id),
  ]);
  const planned = items.reduce((sum, item) => sum + item.planned, 0);
  const actual = items.reduce((sum, item) => sum + item.actual, 0);
  return { items, totals: { planned, actual, income, balance: income.tickets + income.slots - actual } };
}

export async function createBudgetItem(event: EventDoc, input: CreateBudgetItemBody) {
  let actual = input.actual;
  if (input.bookingId) {
    const booking = await BookingModel.findOne({
      _id: input.bookingId,
      organizerId: event.organizerId,
      status: { $in: LINKABLE_BOOKING_STATUSES },
    });
    if (!booking || (booking.eventId && !booking.eventId.equals(event._id))) {
      throw AppError.badRequest('BOOKING_NOT_LINKABLE');
    }
    if (actual === undefined && PAID_BOOKING_STATUSES.includes(booking.status)) actual = booking.amount ?? 0;
  }
  return BudgetItemModel.create({
    ...input,
    actual: actual ?? 0,
    eventId: event._id,
    source: input.bookingId ? 'service' : 'manual',
  });
}

export async function updateBudgetItem(event: EventDoc, itemId: string, input: UpdateBudgetItemBody) {
  const item = await findItem(BudgetItemModel, event, itemId);
  applyChanges(item, input);
  await item.save();
  return item;
}

export const deleteBudgetItem = (event: EventDoc, itemId: string) => removeItem(BudgetItemModel, event, itemId);

const byDueDate = (a: { dueAt?: Date | null }, b: { dueAt?: Date | null }) => {
  if (!a.dueAt) return b.dueAt ? 1 : 0;
  if (!b.dueAt) return -1;
  return a.dueAt.getTime() - b.dueAt.getTime();
};

export async function getChecklist(event: EventDoc) {
  const items = await ChecklistItemModel.find({ eventId: event._id }).sort({ createdAt: 1, _id: 1 });
  items.sort(byDueDate);
  const done = items.filter((item) => item.done).length;
  return { items, progress: items.length ? Math.round((done / items.length) * 100) : 0 };
}

export const createChecklistItem = (event: EventDoc, input: CreateChecklistItemBody) =>
  ChecklistItemModel.create({ ...input, eventId: event._id });

export async function updateChecklistItem(event: EventDoc, itemId: string, input: UpdateChecklistItemBody) {
  const item = await findItem(ChecklistItemModel, event, itemId);
  applyChanges(item, input);
  await item.save();
  return item;
}

export const deleteChecklistItem = (event: EventDoc, itemId: string) => removeItem(ChecklistItemModel, event, itemId);

export async function listGuests(event: EventDoc, query: ListGuestsQuery) {
  const filter: FilterQuery<Guest> = { eventId: event._id };
  if (query.category) filter.category = query.category;
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }
  const [items, total] = await Promise.all([
    GuestModel.find(filter).sort({ name: 1, _id: 1 }).skip(skipFor(query)).limit(query.limit),
    GuestModel.countDocuments(filter),
  ]);
  return { items, total };
}

export const createGuest = (event: EventDoc, input: CreateGuestBody) =>
  GuestModel.create({ ...input, eventId: event._id, source: 'manual' });

export async function updateGuest(event: EventDoc, guestId: string, input: UpdateGuestBody) {
  const guest = await findItem(GuestModel, event, guestId);
  applyChanges(guest, input);
  await guest.save();
  return guest;
}

export const deleteGuest = (event: EventDoc, guestId: string) => removeItem(GuestModel, event, guestId);

export async function importBuyers(event: EventDoc) {
  const [tickets, tiers] = await Promise.all([
    TicketModel.find({ eventId: event._id, status: { $in: ['valid', 'checked_in'] } })
      .select('holderId tierId')
      .lean(),
    TicketTierModel.find({ eventId: event._id }).select('name').lean(),
  ]);
  const tierName = new Map(tiers.map((tier) => [String(tier._id), tier.name as TierName]));
  const bestTier = new Map<string, TierName>();
  for (const ticket of tickets) {
    const holder = String(ticket.holderId);
    const name = tierName.get(String(ticket.tierId)) ?? 'standard';
    const current = bestTier.get(holder);
    if (!current || TIER_RANK[name] > TIER_RANK[current]) bestTier.set(holder, name);
  }
  if (bestTier.size === 0) return { imported: 0, skipped: 0 };

  const buyers = await UserModel.find({ _id: { $in: [...bestTier.keys()] } })
    .select('name email phone')
    .lean();
  const existing = await GuestModel.find({
    eventId: event._id,
    $or: [
      { phone: { $in: buyers.map((buyer) => buyer.phone) } },
      { email: { $in: buyers.flatMap((buyer) => (buyer.email ? [buyer.email] : [])) } },
    ],
  })
    .select('phone email')
    .lean();
  const knownPhones = new Set(existing.map((guest) => guest.phone).filter(Boolean));
  const knownEmails = new Set(existing.map((guest) => guest.email).filter(Boolean));

  const fresh = buyers.filter(
    (buyer) => !knownPhones.has(buyer.phone) && !(buyer.email && knownEmails.has(buyer.email)),
  );
  if (fresh.length) {
    await GuestModel.insertMany(
      fresh.map((buyer) => ({
        eventId: event._id,
        name: buyer.name,
        phone: buyer.phone,
        email: buyer.email ?? undefined,
        category: bestTier.get(String(buyer._id)) ?? 'standard',
        source: 'ticket',
      })),
    );
  }
  return { imported: fresh.length, skipped: buyers.length - fresh.length };
}

function assertInsideEvent(event: EventDoc, startAt: Date, endAt: Date) {
  if (startAt < event.startAt || endAt > event.endAt) {
    throw AppError.badRequest('AGENDA_OUTSIDE_EVENT', { startAt: event.startAt, endAt: event.endAt });
  }
}

export async function listAgenda(eventId: string, viewer: Viewer) {
  const event = await EventModel.findById(eventId);
  if (!event) throw AppError.notFound();
  const isOwner = viewer?.role === 'admin' || (viewer !== undefined && String(event.organizerId) === viewer.id);
  if (!isOwner && !PUBLIC_STATUSES.includes(event.status as EventStatus)) throw AppError.notFound();
  return AgendaItemModel.find({ eventId: event._id }).sort({ startAt: 1, _id: 1 });
}

export async function createAgendaItem(event: EventDoc, input: CreateAgendaItemBody) {
  assertInsideEvent(event, input.startAt, input.endAt);
  return AgendaItemModel.create({ ...input, eventId: event._id });
}

export async function updateAgendaItem(event: EventDoc, itemId: string, input: UpdateAgendaItemBody) {
  const item = await findItem(AgendaItemModel, event, itemId);
  applyChanges(item, input);
  assertInsideEvent(event, item.startAt, item.endAt);
  await item.save();
  return item;
}

export const deleteAgendaItem = (event: EventDoc, itemId: string) => removeItem(AgendaItemModel, event, itemId);
