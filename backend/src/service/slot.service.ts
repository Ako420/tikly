import type { ClientSession, FilterQuery, Types } from 'mongoose';
import {
  EventModel,
  SlotBookingModel,
  SlotModel,
  UserModel,
  type Event,
  type EventDoc,
  type OrderDoc,
  type SlotBooking,
  type SlotDoc,
} from '../model';
import type { CreateSlotBody, ExhibitorEventsQuery, UpdateSlotBody } from '../schema/slot.schema';
import type { EventStatus, Role } from '../types/enums';
import { AppError } from '../util/AppError';
import type { Page } from '../util/pagination';
import { skipFor } from '../util/pagination';
import { exactInsensitive } from '../util/regex';
import { notifyUsers } from './notification.service';

type Viewer = { id: string; role: Role } | undefined;
type SlotLike = {
  _id: Types.ObjectId;
  eventId?: Types.ObjectId | null;
  label: string;
  size?: string | null;
  price: number;
  quantity: number;
  booked: number;
  reserved: number;
};
type OrderItem = { refId: Types.ObjectId; quantity: number };

const PUBLIC_STATUSES: EventStatus[] = ['published', 'completed'];
const CLOSED_STATUSES: EventStatus[] = ['cancelled', 'completed', 'suspended'];
const hasRoom = (extra = 0) => ({ $expr: { $lte: [{ $add: ['$booked', '$reserved', extra] }, '$quantity'] } });

export const slotsLeft = (slot: SlotLike) => Math.max(0, slot.quantity - slot.booked - slot.reserved);

export const toSlotView = (slot: SlotLike) => ({
  id: String(slot._id),
  eventId: String(slot.eventId),
  label: slot.label,
  size: slot.size ?? undefined,
  price: slot.price,
  quantity: slot.quantity,
  available: slotsLeft(slot),
});

const toOwnerSlotView = (slot: SlotLike) => ({ ...toSlotView(slot), booked: slot.booked, reserved: slot.reserved });

const isOwner = (event: { organizerId?: Types.ObjectId | null }, viewer: Viewer) =>
  viewer?.role === 'admin' || (viewer !== undefined && String(event.organizerId) === viewer.id);

export async function listSlots(eventId: string, viewer: Viewer) {
  const event = await EventModel.findById(eventId).select('organizerId status').lean();
  if (!event) throw AppError.notFound();
  const owner = isOwner(event, viewer);
  if (!owner && !PUBLIC_STATUSES.includes(event.status as EventStatus)) throw AppError.notFound();
  const slots = await SlotModel.find({ eventId: event._id }).sort({ price: 1, _id: 1 }).lean();
  return slots.map(owner ? toOwnerSlotView : toSlotView);
}

function assertOpen(event: EventDoc) {
  if (CLOSED_STATUSES.includes(event.status as EventStatus) || event.endAt <= new Date()) {
    throw AppError.conflict('EVENT_NOT_EDITABLE');
  }
}

export async function createSlot(event: EventDoc, input: CreateSlotBody) {
  assertOpen(event);
  return toOwnerSlotView(await SlotModel.create({ ...input, eventId: event._id }));
}

export async function updateSlot(slot: SlotDoc, event: EventDoc, input: UpdateSlotBody) {
  assertOpen(event);
  const filter: FilterQuery<SlotLike> = { _id: slot._id };
  if (input.price !== undefined && input.price !== slot.price) filter.booked = 0;
  if (input.quantity !== undefined) filter.$expr = { $lte: [{ $add: ['$booked', '$reserved'] }, input.quantity] };
  const changes = Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined));
  const updated = await SlotModel.findOneAndUpdate(filter, { $set: changes }, { new: true }).lean();
  if (updated) return toOwnerSlotView(updated);

  const current = await SlotModel.findById(slot._id).lean();
  if (!current) throw AppError.notFound();
  if (input.price !== undefined && input.price !== current.price && current.booked > 0) {
    throw AppError.conflict('SLOT_PRICE_LOCKED', { booked: current.booked });
  }
  throw AppError.conflict('SLOT_QUANTITY_BELOW_BOOKED', { minimum: current.booked + current.reserved });
}

export async function deleteSlot(slot: SlotDoc) {
  const { deletedCount } = await SlotModel.deleteOne({ _id: slot._id, booked: 0, reserved: 0 });
  if (deletedCount === 0) throw AppError.conflict('SLOT_IN_USE');
  await SlotBookingModel.deleteMany({ slotId: slot._id, status: { $in: ['expired', 'cancelled'] } });
}

export async function listExhibitorEvents(query: ExhibitorEventsQuery) {
  const open = await SlotModel.aggregate<{ _id: Types.ObjectId; available: number; priceFrom: number }>([
    { $match: hasRoom(1) },
    {
      $group: {
        _id: '$eventId',
        available: { $sum: { $subtract: ['$quantity', { $add: ['$booked', '$reserved'] }] } },
        priceFrom: { $min: '$price' },
      },
    },
  ]);
  const filter: FilterQuery<Event> = {
    _id: { $in: open.map((row) => row._id) },
    status: 'published',
    startAt: { $gte: query.from ?? new Date() },
  };
  if (query.city) filter.city = exactInsensitive(query.city);
  const [events, total] = await Promise.all([
    EventModel.find(filter).sort({ startAt: 1, _id: 1 }).skip(skipFor(query)).limit(query.limit),
    EventModel.countDocuments(filter),
  ]);
  const byEvent = new Map(open.map((row) => [String(row._id), row]));
  const items = events.map((event) => ({
    ...event.toJSON(),
    slotsAvailable: byEvent.get(event.id)?.available ?? 0,
    slotPriceFrom: byEvent.get(event.id)?.priceFrom ?? null,
  }));
  return { items, total };
}

async function slotBookingViews(filter: FilterQuery<SlotBooking>, page?: Page) {
  const query = SlotBookingModel.find(filter).sort({ createdAt: -1, _id: -1 });
  if (page) query.skip(skipFor(page)).limit(page.limit);
  const [bookings, total] = await Promise.all([query.lean(), SlotBookingModel.countDocuments(filter)]);
  const slots = await SlotModel.find({ _id: { $in: bookings.map((booking) => booking.slotId) } })
    .select('eventId label size price')
    .lean();
  const [events, exhibitors] = await Promise.all([
    EventModel.find({ _id: { $in: slots.map((slot) => slot.eventId) } })
      .select('title startAt venue city')
      .lean(),
    UserModel.find({ _id: { $in: bookings.map((booking) => booking.exhibitorId) } })
      .select('name email phone')
      .lean(),
  ]);
  const slotOf = new Map(slots.map((slot) => [String(slot._id), slot]));
  const eventOf = new Map(events.map((event) => [String(event._id), event]));
  const exhibitorOf = new Map(exhibitors.map((user) => [String(user._id), user]));
  const items = bookings.map((booking) => {
    const slot = slotOf.get(String(booking.slotId));
    const event = slot ? eventOf.get(String(slot.eventId)) : undefined;
    const exhibitor = exhibitorOf.get(String(booking.exhibitorId));
    return {
      id: String(booking._id),
      status: booking.status,
      quantity: booking.quantity,
      orderId: String(booking.orderId),
      slot: slot ? { id: String(slot._id), label: slot.label, size: slot.size ?? undefined, price: slot.price } : null,
      event: event
        ? { id: String(event._id), title: event.title, startAt: event.startAt, venue: event.venue, city: event.city }
        : null,
      exhibitor: exhibitor
        ? {
            id: String(exhibitor._id),
            name: exhibitor.name,
            email: exhibitor.email ?? undefined,
            phone: exhibitor.phone,
          }
        : null,
      createdAt: (booking as { createdAt?: Date }).createdAt,
    };
  });
  return { items, total };
}

export const listMySlotBookings = (exhibitorId: string, page: Page) =>
  slotBookingViews({ exhibitorId, status: { $in: ['pending', 'paid'] } }, page);

export async function listEventSlotBookings(event: EventDoc) {
  const slotIds = await SlotModel.find({ eventId: event._id }).distinct('_id');
  return (await slotBookingViews({ slotId: { $in: slotIds }, status: 'paid' })).items;
}

export async function exhibitorsOf(eventId: Types.ObjectId | string) {
  const slots = await SlotModel.find({ eventId }).select('label').lean();
  if (slots.length === 0) return [];
  const labels = new Map(slots.map((slot) => [String(slot._id), slot.label]));
  const bookings = await SlotBookingModel.find({ slotId: { $in: [...labels.keys()] }, status: 'paid' })
    .sort({ createdAt: 1 })
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

export async function listPublicExhibitors(eventId: string) {
  const event = await EventModel.findById(eventId).select('status').lean();
  if (!event || !PUBLIC_STATUSES.includes(event.status as EventStatus)) throw AppError.notFound();
  return exhibitorsOf(event._id);
}

export async function findBookableSlot(slotId: string) {
  const slot = await SlotModel.findById(slotId).lean();
  if (!slot) throw AppError.notFound();
  const event = await EventModel.findById(slot.eventId);
  if (!event || event.status !== 'published') throw AppError.badRequest('EVENT_NOT_PUBLISHED');
  if (event.startAt <= new Date()) throw AppError.conflict('SLOT_SALES_CLOSED');
  return { slot, event };
}

export function reserveSlot(slotId: Types.ObjectId | string, quantity: number, session?: ClientSession) {
  return SlotModel.findOneAndUpdate(
    { _id: slotId, ...hasRoom(quantity) },
    { $inc: { reserved: quantity } },
    { new: true, session },
  );
}

export async function releaseSlots(items: OrderItem[], session?: ClientSession) {
  for (const item of items) {
    await SlotModel.updateOne(
      { _id: item.refId, reserved: { $gte: item.quantity } },
      { $inc: { reserved: -item.quantity } },
      { session },
    );
  }
}

export async function reserveSlotsAgain(order: OrderDoc, session: ClientSession) {
  const taken: OrderItem[] = [];
  for (const item of order.items) {
    if (!(await reserveSlot(item.refId, item.quantity, session))) {
      await releaseSlots(taken, session);
      return false;
    }
    taken.push(item);
  }
  return true;
}

export async function confirmSlots(order: OrderDoc, session: ClientSession) {
  for (const item of order.items) {
    const moved = await SlotModel.updateOne(
      { _id: item.refId, reserved: { $gte: item.quantity } },
      { $inc: { reserved: -item.quantity, booked: item.quantity } },
      { session },
    );
    if (moved.modifiedCount === 0) throw new Error(`Reserved slots missing for order ${order.id}`);
  }
  await SlotBookingModel.updateOne({ orderId: order._id }, { status: 'paid' }, { session });
}

export async function closeSlotBooking(order: OrderDoc, status: 'failed' | 'expired', session: ClientSession) {
  await releaseSlots(order.items, session);
  await SlotBookingModel.updateOne(
    { orderId: order._id, status: 'pending' },
    { status: status === 'expired' ? 'expired' : 'cancelled' },
    { session },
  );
}

export async function announceSlotsBooked(order: OrderDoc) {
  const [exhibitor, slots] = await Promise.all([
    UserModel.findById(order.buyerId).select('name').lean(),
    SlotModel.find({ _id: { $in: order.items.map((item) => item.refId) } })
      .select('label')
      .lean(),
  ]);
  await notifyUsers(
    [String(order.payeeId)],
    'slot_booked',
    {
      orderId: order.id,
      exhibitor: exhibitor?.name ?? '',
      slots: slots.map((slot) => slot.label),
      quantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
    },
    String(order.eventId),
  );
}
