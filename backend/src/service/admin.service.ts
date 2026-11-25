import type { FilterQuery, Types } from 'mongoose';
import {
  EventModel,
  OrderModel,
  ProviderModel,
  ReviewModel,
  ServiceModel,
  TicketModel,
  TransactionModel,
  UserModel,
  type Event,
  type User,
} from '../model';
import type { AdminEventsQuery, AdminProvidersQuery, AdminUsersQuery, StatsQuery } from '../schema/admin.schema';
import { EVENT_STATUSES, ORDER_TYPES, ROLES, type OrderType } from '../types/enums';
import { AppError } from '../util/AppError';
import { toServiceView } from '../util/catalogView';
import { skipFor } from '../util/pagination';
import { escapeRegex } from '../util/regex';
import { notifyUsers } from './notification.service';
import { refreshRating } from './review.service';
import { documentViewUrl } from './upload.service';

type Person = { _id: Types.ObjectId; name: string; email?: string | null; phone: string };

const toPerson = (user: Person | undefined) =>
  user ? { id: String(user._id), name: user.name, email: user.email ?? undefined, phone: user.phone } : null;

async function peopleById(ids: (Types.ObjectId | null | undefined)[]) {
  const users = await UserModel.find({ _id: { $in: ids.filter(Boolean) } })
    .select('name email phone')
    .lean();
  return new Map(users.map((user) => [String(user._id), user as Person]));
}

const eventTitle = (event: { title?: { en?: string | null; fr?: string | null } | null }) =>
  event.title?.en || event.title?.fr || '';

export async function listEvents(query: AdminEventsQuery) {
  const filter: FilterQuery<Event> = { status: query.status };
  const order = query.status === 'pending' ? 1 : -1;
  const [events, total] = await Promise.all([
    EventModel.find(filter).sort({ updatedAt: order, _id: order }).skip(skipFor(query)).limit(query.limit),
    EventModel.countDocuments(filter),
  ]);
  const organizers = await peopleById(events.map((event) => event.organizerId));
  const items = events.map((event) => ({
    ...event.toJSON(),
    organizer: toPerson(organizers.get(String(event.organizerId))),
  }));
  return { items, total };
}

async function moveEvent(eventId: string, from: string[], changes: Record<string, unknown>, conflict: string) {
  const event = await EventModel.findOneAndUpdate({ _id: eventId, status: { $in: from } }, changes, {
    new: true,
    runValidators: true,
  });
  if (event) return event;
  if (!(await EventModel.exists({ _id: eventId }))) throw AppError.notFound();
  throw AppError.conflict(conflict);
}

export async function approveEvent(eventId: string) {
  const event = await moveEvent(
    eventId,
    ['pending'],
    { status: 'published', $unset: { rejectionReason: 1 } },
    'EVENT_NOT_PENDING',
  );
  await notifyUsers([String(event.organizerId)], 'event_approved', { title: eventTitle(event) }, event.id);
  return event;
}

export async function rejectEvent(eventId: string, reason: string) {
  const event = await moveEvent(
    eventId,
    ['pending'],
    { status: 'rejected', rejectionReason: reason },
    'EVENT_NOT_PENDING',
  );
  await notifyUsers([String(event.organizerId)], 'event_rejected', { title: eventTitle(event), reason }, event.id);
  return event;
}

export async function setEventStatus(eventId: string, status: 'published' | 'suspended') {
  const from = status === 'suspended' ? 'published' : 'suspended';
  const event = await moveEvent(eventId, [from], { status }, 'EVENT_STATUS_LOCKED');
  if (status === 'suspended') {
    await notifyUsers([String(event.organizerId)], 'event_suspended', { title: eventTitle(event) }, event.id);
  }
  return event;
}

export async function listProviders(query: AdminProvidersQuery) {
  const filter = { verification: query.verification };
  const order = query.verification === 'pending' ? 1 : -1;
  const [providers, total] = await Promise.all([
    ProviderModel.find(filter).sort({ updatedAt: order, _id: order }).skip(skipFor(query)).limit(query.limit),
    ProviderModel.countDocuments(filter),
  ]);
  const owners = await peopleById(providers.map((provider) => provider.userId));
  const items = providers.map((provider) => ({
    ...provider.toJSON(),
    user: toPerson(owners.get(String(provider.userId))),
  }));
  return { items, total };
}

export async function getProvider(providerId: string) {
  const provider = await ProviderModel.findById(providerId);
  if (!provider) throw AppError.notFound();
  const [owners, services] = await Promise.all([
    peopleById([provider.userId]),
    ServiceModel.find({ providerId: provider._id }).sort({ createdAt: -1 }).lean(),
  ]);
  return {
    ...provider.toJSON(),
    user: toPerson(owners.get(String(provider.userId))),
    documents: provider.documents.map((publicId) => ({ publicId, ...documentViewUrl(publicId) })),
    services: services.map(toServiceView),
  };
}

async function moveProvider(providerId: string, from: string[], changes: Record<string, unknown>, conflict: string) {
  const provider = await ProviderModel.findOneAndUpdate({ _id: providerId, verification: { $in: from } }, changes, {
    new: true,
  });
  if (provider) return provider;
  if (!(await ProviderModel.exists({ _id: providerId }))) throw AppError.notFound();
  throw AppError.conflict(conflict);
}

export async function verifyProvider(providerId: string) {
  const provider = await moveProvider(
    providerId,
    ['pending', 'rejected'],
    { verification: 'verified', $unset: { rejectionReason: 1 } },
    'PROVIDER_ALREADY_VERIFIED',
  );
  await notifyUsers([String(provider.userId)], 'provider_verified', { providerId: provider.id });
  return provider;
}

export async function rejectProvider(providerId: string, reason: string) {
  const provider = await moveProvider(
    providerId,
    ['pending', 'verified'],
    { verification: 'rejected', rejectionReason: reason },
    'PROVIDER_ALREADY_REJECTED',
  );
  await notifyUsers([String(provider.userId)], 'provider_rejected', { providerId: provider.id, reason });
  return provider;
}

export async function listUsers(query: AdminUsersQuery) {
  const filter: FilterQuery<User> = {};
  if (query.role) filter.role = query.role;
  if (query.status) filter.status = query.status;
  if (query.q) {
    const pattern = new RegExp(escapeRegex(query.q), 'i');
    filter.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }];
  }
  const [items, total] = await Promise.all([
    UserModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(query)).limit(query.limit),
    UserModel.countDocuments(filter),
  ]);
  return { items, total };
}

export async function setUserStatus(adminId: string, userId: string, status: 'active' | 'suspended') {
  if (adminId === userId) throw AppError.conflict('CANNOT_CHANGE_OWN_STATUS');
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { status, ...(status === 'suspended' && { $unset: { refreshTokenHash: 1 } }) },
    { new: true },
  );
  if (!user) throw AppError.notFound();
  return user;
}

export async function setServiceActive(serviceId: string, active: boolean) {
  const service = await ServiceModel.findByIdAndUpdate(serviceId, { active }, { new: true }).lean();
  if (!service) throw AppError.notFound();
  return toServiceView(service);
}

export async function setReviewHidden(reviewId: string, hidden: boolean) {
  const review = await ReviewModel.findByIdAndUpdate(reviewId, { hidden }, { new: true });
  if (!review) throw AppError.notFound();
  const rating = await refreshRating(review.target, review.targetId);
  return { ...review.toJSON(), targetRating: rating };
}

const countBy = async <K extends string>(
  model: typeof UserModel | typeof EventModel,
  field: string,
  keys: readonly K[],
) => {
  const rows = await (model as typeof UserModel).aggregate<{ _id: K; count: number }>([
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(keys.map((key) => [key, 0])) as Record<K, number>;
  for (const row of rows) if (row._id in counts) counts[row._id] = row.count;
  return { ...counts, total: rows.reduce((sum, row) => sum + row.count, 0) };
};

export async function getStats(query: StatsQuery) {
  const createdAt: { $gte?: Date; $lte?: Date } = {};
  if (query.from) createdAt.$gte = query.from;
  if (query.to) createdAt.$lte = query.to;
  const inRange = Object.keys(createdAt).length ? { createdAt } : {};

  const [users, events, ticketsSold, money] = await Promise.all([
    countBy(UserModel, 'role', ROLES),
    countBy(EventModel, 'status', EVENT_STATUSES),
    TicketModel.countDocuments({ status: { $in: ['valid', 'checked_in'] }, ...inRange }),
    TransactionModel.aggregate<{
      _id: { type: OrderType; kind: 'payment' | 'refund' };
      count: number;
      amount: number;
      commission: number;
      payeeShare: number;
    }>([
      { $match: { status: 'successful', ...inRange } },
      { $lookup: { from: OrderModel.collection.name, localField: 'orderId', foreignField: '_id', as: 'order' } },
      { $unwind: '$order' },
      {
        $group: {
          _id: { type: '$order.type', kind: '$kind' },
          count: { $sum: 1 },
          amount: { $sum: '$amount' },
          commission: { $sum: '$commission' },
          payeeShare: { $sum: '$payeeShare' },
        },
      },
    ]),
  ]);

  const revenue = Object.fromEntries(
    ORDER_TYPES.map((type) => {
      const paid = money.find((row) => row._id.type === type && row._id.kind === 'payment');
      const refunded = money.find((row) => row._id.type === type && row._id.kind === 'refund');
      return [
        type,
        {
          payments: paid?.count ?? 0,
          gross: paid?.amount ?? 0,
          commission: paid?.commission ?? 0,
          payees: paid?.payeeShare ?? 0,
          refunded: refunded?.amount ?? 0,
        },
      ];
    }),
  ) as Record<OrderType, { payments: number; gross: number; commission: number; payees: number; refunded: number }>;
  const streams = Object.values(revenue);

  return {
    from: query.from ?? null,
    to: query.to ?? null,
    users,
    events,
    ticketsSold,
    revenue: {
      ...revenue,
      total: {
        gross: streams.reduce((sum, stream) => sum + stream.gross, 0),
        commission: streams.reduce((sum, stream) => sum + stream.commission, 0),
        refunded: streams.reduce((sum, stream) => sum + stream.refunded, 0),
      },
    },
  };
}
