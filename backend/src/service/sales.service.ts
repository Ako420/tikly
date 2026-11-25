import { Types, type FilterQuery } from 'mongoose';
import { OrderModel, TicketModel, TicketTierModel, UserModel } from '../model';
import type { EventDoc } from '../model/event.model';
import type { Order } from '../model/order.model';
import type { Ticket } from '../model/ticket.model';
import type { EventAttendeesQuery, EventOrdersQuery } from '../schema/sales.schema';
import { skipFor } from '../util/pagination';
import { escapeRegex } from '../util/regex';

type Timestamped = { createdAt?: Date };

type Person = { id: string; name: string; email?: string; phone?: string };

async function matchingUserIds(q: string) {
  const pattern = new RegExp(escapeRegex(q), 'i');
  return UserModel.find({ $or: [{ name: pattern }, { email: pattern }, { phone: pattern }] })
    .limit(200)
    .distinct('_id');
}

async function peopleById(ids: (Types.ObjectId | null | undefined)[]) {
  const users = await UserModel.find({ _id: { $in: ids.filter(Boolean) } })
    .select('name email phone')
    .lean();
  return new Map<string, Person>(
    users.map((user) => [
      String(user._id),
      { id: String(user._id), name: user.name, email: user.email ?? undefined, phone: user.phone ?? undefined },
    ]),
  );
}

async function tierNames(eventId: Types.ObjectId) {
  const tiers = await TicketTierModel.find({ eventId }).select('name').lean();
  return new Map(tiers.map((tier) => [String(tier._id), tier.name]));
}

export async function listEventOrders(event: EventDoc, query: EventOrdersQuery) {
  const filter: FilterQuery<Order> = { eventId: event._id, type: 'ticket' };
  if (query.status) filter.status = query.status;
  if (query.q) {
    const q = query.q.trim();
    const or: FilterQuery<Order>[] = [
      { buyerId: { $in: await matchingUserIds(q) } },
      { phone: new RegExp(escapeRegex(q), 'i') },
    ];
    const ticketOrders = await TicketModel.find({ eventId: event._id, code: q.toUpperCase() }).distinct('orderId');
    if (ticketOrders.length) or.push({ _id: { $in: ticketOrders } });
    filter.$or = or;
  }

  const [orders, total, tiers] = await Promise.all([
    OrderModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(query)).limit(query.limit).lean(),
    OrderModel.countDocuments(filter),
    tierNames(event._id),
  ]);
  const buyers = await peopleById(orders.map((order) => order.buyerId));

  const items = orders.map((order) => ({
    id: String(order._id),
    buyer: buyers.get(String(order.buyerId)) ?? { id: String(order.buyerId), name: '' },
    phone: order.phone ?? undefined,
    amount: order.amount,
    status: order.status,
    tickets: order.items.reduce((sum, item) => sum + item.quantity, 0),
    items: order.items.map((item) => ({
      tier: tiers.get(String(item.refId)) ?? '',
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    createdAt: (order as Timestamped).createdAt,
    paidAt: order.paidAt ?? undefined,
  }));
  return { items, total };
}

export async function listEventAttendees(event: EventDoc, query: EventAttendeesQuery) {
  const filter: FilterQuery<Ticket> = { eventId: event._id };
  if (query.status) filter.status = query.status;
  if (query.tierId) filter.tierId = new Types.ObjectId(query.tierId);
  if (query.q) {
    const q = query.q.trim();
    filter.$or = [{ holderId: { $in: await matchingUserIds(q) } }, { code: q.toUpperCase() }];
  }

  const [tickets, total, tiers] = await Promise.all([
    TicketModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(query)).limit(query.limit).lean(),
    TicketModel.countDocuments(filter),
    tierNames(event._id),
  ]);
  const holders = await peopleById(tickets.map((ticket) => ticket.holderId));

  const items = tickets.map((ticket) => {
    const entries = ticket.checkIns.filter((checkIn) => checkIn.type === 'entry');
    return {
      id: String(ticket._id),
      code: ticket.code,
      tier: tiers.get(String(ticket.tierId)) ?? '',
      holder: holders.get(String(ticket.holderId)) ?? { id: String(ticket.holderId), name: '' },
      orderId: String(ticket.orderId),
      status: ticket.status,
      checkedInAt: entries[0]?.at ?? undefined,
      reentries: ticket.checkIns.length - entries.length,
      createdAt: (ticket as Timestamped).createdAt,
    };
  });
  return { items, total };
}
