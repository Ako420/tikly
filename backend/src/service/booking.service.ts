import type { ClientSession, FilterQuery, Types } from 'mongoose';
import {
  BookingModel,
  BudgetItemModel,
  EventModel,
  OrderModel,
  ProviderModel,
  ServiceModel,
  UserModel,
  type Booking,
  type BookingDoc,
  type OrderDoc,
} from '../model';
import type {
  AcceptBookingBody,
  CreateBookingBody,
  DeclineBookingBody,
  ListBookingsQuery,
} from '../schema/booking.schema';
import type { Role } from '../types/enums';
import { AppError } from '../util/AppError';
import { skipFor } from '../util/pagination';
import { notifyUsers } from './notification.service';

export type BookingParty = 'organizer' | 'provider' | 'admin';
type Viewer = { id: string; role: Role };

type BookingLike = {
  _id: Types.ObjectId;
  serviceId?: Types.ObjectId | null;
  organizerId?: Types.ObjectId | null;
  eventId?: Types.ObjectId | null;
  orderId?: Types.ObjectId | null;
  startDate: Date;
  endDate: Date;
  quantity: number;
  amount?: number | null;
  note?: string | null;
  declineReason?: string | null;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const serviceTitle = (title: { en?: string | null; fr?: string | null } | null | undefined) =>
  title?.en || title?.fr || '';

async function toBookingViews(bookings: BookingLike[]) {
  const ids = <K extends keyof BookingLike>(key: K) => [
    ...new Set(
      bookings
        .map((booking) => booking[key])
        .filter(Boolean)
        .map(String),
    ),
  ];
  const [services, organizers, events, orders] = await Promise.all([
    ServiceModel.find({ _id: { $in: ids('serviceId') } })
      .select('providerId category title unit price photos')
      .lean(),
    UserModel.find({ _id: { $in: ids('organizerId') } })
      .select('name phone')
      .lean(),
    EventModel.find({ _id: { $in: ids('eventId') } })
      .select('title startAt city')
      .lean(),
    OrderModel.find({ _id: { $in: ids('orderId') } })
      .select('status')
      .lean(),
  ]);
  const providers = await ProviderModel.find({ _id: { $in: services.map((service) => service.providerId) } })
    .select('businessName phone whatsapp')
    .lean();
  const byId = <T extends { _id: Types.ObjectId }>(docs: T[]) => new Map(docs.map((doc) => [String(doc._id), doc]));
  const [serviceOf, organizerOf, eventOf, orderOf, providerOf] = [
    byId(services),
    byId(organizers),
    byId(events),
    byId(orders),
    byId(providers),
  ];

  return bookings.map((booking) => {
    const service = serviceOf.get(String(booking.serviceId));
    const provider = service ? providerOf.get(String(service.providerId)) : undefined;
    const organizer = organizerOf.get(String(booking.organizerId));
    const event = booking.eventId ? eventOf.get(String(booking.eventId)) : undefined;
    const order = booking.orderId ? orderOf.get(String(booking.orderId)) : undefined;
    return {
      id: String(booking._id),
      status: booking.status,
      startDate: booking.startDate,
      endDate: booking.endDate,
      quantity: booking.quantity,
      amount: booking.amount ?? null,
      note: booking.note ?? undefined,
      declineReason: booking.declineReason ?? undefined,
      service: service
        ? {
            id: String(service._id),
            category: service.category,
            title: service.title,
            unit: service.unit,
            price: service.price,
            photo: service.photos?.[0] ?? null,
          }
        : null,
      provider: provider
        ? {
            id: String(provider._id),
            businessName: provider.businessName,
            phone: provider.phone,
            whatsapp: provider.whatsapp ?? undefined,
          }
        : null,
      organizer: organizer ? { id: String(organizer._id), name: organizer.name, phone: organizer.phone } : null,
      event: event ? { id: String(event._id), title: event.title, startAt: event.startAt, city: event.city } : null,
      payment: order ? { orderId: String(order._id), status: order.status } : null,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
    };
  });
}

export const toBookingView = async (booking: BookingLike) => (await toBookingViews([booking]))[0]!;

async function providerUserOf(booking: BookingLike) {
  const service = await ServiceModel.findById(booking.serviceId).select('providerId').lean();
  const provider = service ? await ProviderModel.findById(service.providerId).select('userId').lean() : null;
  return provider ? String(provider.userId) : null;
}

export async function partyOf(booking: BookingLike, viewer: Viewer): Promise<BookingParty | null> {
  if (viewer.role === 'admin') return 'admin';
  if (String(booking.organizerId) === viewer.id) return 'organizer';
  return (await providerUserOf(booking)) === viewer.id ? 'provider' : null;
}

export async function requestBooking(organizerId: string, input: CreateBookingBody) {
  const service = await ServiceModel.findOne({ _id: input.serviceId, active: true }).lean();
  const provider = service
    ? await ProviderModel.findOne({ _id: service.providerId, verification: 'verified' }).lean()
    : null;
  if (!service || !provider) throw AppError.notFound();
  if (input.eventId) {
    const event = await EventModel.findById(input.eventId).select('organizerId').lean();
    if (!event) throw AppError.notFound();
    if (String(event.organizerId) !== organizerId) throw AppError.forbidden();
  }

  const booking = await BookingModel.create({ ...input, organizerId, status: 'requested' });
  await notifyUsers([String(provider.userId)], 'booking_requested', {
    bookingId: booking.id,
    service: serviceTitle(service.title),
    startDate: booking.startDate,
    quantity: booking.quantity,
  });
  return toBookingView(booking);
}

export async function listBookings(viewer: Viewer, query: ListBookingsQuery) {
  const filter: FilterQuery<Booking> = {};
  if (viewer.role === 'organizer') {
    filter.organizerId = viewer.id;
  } else {
    const provider = await ProviderModel.findOne({ userId: viewer.id }).select('_id').lean();
    if (!provider) return { items: [], total: 0 };
    filter.serviceId = { $in: await ServiceModel.find({ providerId: provider._id }).distinct('_id') };
  }
  if (query.status) filter.status = query.status;
  const [bookings, total] = await Promise.all([
    BookingModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(query)).limit(query.limit).lean(),
    BookingModel.countDocuments(filter),
  ]);
  return { items: await toBookingViews(bookings), total };
}

async function transition(
  booking: BookingDoc,
  from: Booking['status'][],
  changes: Partial<Booking> & { $unset?: Record<string, 1> },
  extra: FilterQuery<Booking> = {},
) {
  return BookingModel.findOneAndUpdate({ _id: booking._id, status: { $in: from }, ...extra }, changes, {
    new: true,
  }).lean();
}

export async function acceptBooking(booking: BookingDoc, input: AcceptBookingBody) {
  const updated = await transition(booking, ['requested'], { status: 'accepted', amount: input.amount });
  if (!updated) throw AppError.conflict('BOOKING_NOT_PENDING');
  await notifyUsers([String(updated.organizerId)], 'booking_accepted', {
    bookingId: booking.id,
    amount: input.amount,
  });
  return toBookingView(updated);
}

export async function declineBooking(booking: BookingDoc, input: DeclineBookingBody) {
  const updated = await transition(booking, ['requested'], {
    status: 'declined',
    ...(input.reason && { declineReason: input.reason }),
  });
  if (!updated) throw AppError.conflict('BOOKING_NOT_PENDING');
  await notifyUsers([String(updated.organizerId)], 'booking_declined', {
    bookingId: booking.id,
    reason: input.reason ?? null,
  });
  return toBookingView(updated);
}

export async function cancelBooking(booking: BookingDoc) {
  if (booking.orderId) {
    const order = await OrderModel.findById(booking.orderId).select('status').lean();
    if (order?.status === 'pending') throw AppError.conflict('BOOKING_PAYMENT_PENDING');
  }
  const updated = await transition(
    booking,
    ['requested', 'accepted'],
    { status: 'cancelled' },
    { orderId: booking.orderId ?? { $exists: false } },
  );
  if (!updated) throw AppError.conflict('BOOKING_NOT_CANCELLABLE');
  const providerUser = await providerUserOf(updated);
  if (providerUser) await notifyUsers([providerUser], 'booking_cancelled', { bookingId: booking.id });
  return toBookingView(updated);
}

export async function completeBooking(booking: BookingDoc, now = new Date()) {
  const updated = await transition(booking, ['paid'], { status: 'completed' }, { endDate: { $lte: now } });
  if (!updated) throw AppError.conflict('BOOKING_NOT_COMPLETABLE');
  return toBookingView(updated);
}

export async function findPayableBooking(organizerId: string, bookingId: string) {
  const booking = await BookingModel.findOne({ _id: bookingId, organizerId });
  if (!booking) throw AppError.notFound();
  if (booking.status !== 'accepted' || !booking.amount) throw AppError.conflict('BOOKING_NOT_PAYABLE');
  if (booking.orderId) {
    const order = await OrderModel.findById(booking.orderId).select('status').lean();
    if (order?.status === 'pending') throw AppError.conflict('BOOKING_PAYMENT_PENDING', { orderId: String(order._id) });
  }
  const service = await ServiceModel.findById(booking.serviceId).select('providerId title').lean();
  const provider = service ? await ProviderModel.findById(service.providerId).select('userId').lean() : null;
  if (!service || !provider) throw AppError.conflict('BOOKING_NOT_PAYABLE');
  return { booking, payeeId: provider.userId, title: serviceTitle(service.title) };
}

export async function linkOrder(booking: BookingDoc, orderId: Types.ObjectId) {
  const linked = await BookingModel.updateOne(
    { _id: booking._id, status: 'accepted', orderId: booking.orderId ?? { $exists: false } },
    { orderId },
  );
  return linked.modifiedCount === 1;
}

export async function markBookingPaid(order: OrderDoc, session: ClientSession) {
  const bookingId = order.items[0]?.refId;
  const booking = await BookingModel.findOneAndUpdate(
    { _id: bookingId, status: 'accepted', orderId: order._id },
    { status: 'paid' },
    { new: true, session },
  );
  if (!booking) return false;
  if (booking.eventId) await recordBudgetLine(booking, session);
  return true;
}

async function recordBudgetLine(booking: BookingDoc, session: ClientSession) {
  const amount = booking.amount ?? 0;
  const linked = await BudgetItemModel.updateOne({ bookingId: booking._id }, { actual: amount }, { session });
  if (linked.matchedCount > 0) return;
  const service = await ServiceModel.findById(booking.serviceId).select('title category').session(session).lean();
  await BudgetItemModel.create(
    [
      {
        eventId: booking.eventId,
        label: serviceTitle(service?.title).slice(0, 150) || 'Service',
        category: service?.category ?? 'other',
        planned: amount,
        actual: amount,
        source: 'service',
        bookingId: booking._id,
      },
    ],
    { session },
  );
}

export async function announceBookingPaid(order: OrderDoc) {
  const booking = await BookingModel.findById(order.items[0]?.refId).lean();
  if (!booking) return;
  const providerUser = await providerUserOf(booking);
  if (providerUser) {
    await notifyUsers([providerUser], 'booking_paid', { bookingId: String(booking._id), amount: order.amount });
  }
}

export async function bookingRefunded(order: OrderDoc) {
  await notifyUsers([String(order.buyerId)], 'booking_cancelled', {
    bookingId: String(order.items[0]?.refId),
    refunded: order.amount,
  });
}
