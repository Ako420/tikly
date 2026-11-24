import { Types, type ClientSession, type FilterQuery } from 'mongoose';
import { RECONCILE_WINDOW_HOURS, RESERVATION_MINUTES } from '../config/constants';
import { PaymentOutcomeUnknownError } from '../lib/payment/errors';
import { getPaymentProvider, type PaymentProvider } from '../lib/payment/provider';
import { logger } from '../lib/logger';
import { sendMail } from '../lib/mailer';
import { buildTicketsPdf } from '../lib/pdf';
import { withTransaction } from '../lib/transaction';
import {
  EventModel,
  OrderModel,
  SlotBookingModel,
  SlotModel,
  TicketModel,
  TicketTierModel,
  TransactionModel,
  UserModel,
  type Order,
  type OrderDoc,
  type TransactionDoc,
} from '../model';
import type { CreateBookingOrderBody, CreateTicketOrderBody, ListMyOrdersQuery } from '../schema/order.schema';
import type { CreateSlotOrderBody } from '../schema/slot.schema';
import type { Language, OrderType, Role, TierName } from '../types/enums';
import { AppError } from '../util/AppError';
import { t } from '../util/i18n';
import { splitAmount } from '../util/money';
import { skipFor } from '../util/pagination';
import { createQrToken } from '../util/qrToken';
import { ticketCode } from '../util/ticketCode';
import {
  announceBookingPaid,
  bookingRefunded,
  findPayableBooking,
  linkOrder,
  markBookingPaid,
} from './booking.service';
import { notifyUsers } from './notification.service';
import {
  announceSlotsBooked,
  closeSlotBooking,
  confirmSlots,
  findBookableSlot,
  releaseSlots,
  reserveSlot,
  reserveSlotsAgain,
} from './slot.service';
import { getCommissionRate } from './setting.service';

type Viewer = { id: string; role: Role };
type OrderItem = { refId: Types.ObjectId; quantity: number };

const REFUND_REASONS: Record<OrderType, string> = {
  ticket: 'Tikly refund: tickets sold out',
  service: 'Tikly refund: booking no longer payable',
  slot: 'Tikly refund: display slots sold out',
};

const minutesFromNow = (minutes: number) => new Date(Date.now() + minutes * 60 * 1000);
const eventTitle = (title: { en?: string | null; fr?: string | null } | null | undefined, lang: Language) =>
  (lang === 'fr' ? title?.fr || title?.en : title?.en || title?.fr) ?? '';

async function reserveTier(
  tierId: Types.ObjectId | string,
  eventId: Types.ObjectId,
  quantity: number,
  session?: ClientSession,
) {
  return TicketTierModel.findOneAndUpdate(
    {
      _id: tierId,
      eventId,
      salesEndAt: { $gt: new Date() },
      $expr: { $lte: [{ $add: ['$sold', '$reserved', quantity] }, '$quantity'] },
    },
    { $inc: { reserved: quantity } },
    { new: true, session },
  );
}

async function releaseItems(items: OrderItem[], session?: ClientSession) {
  for (const item of items) {
    await TicketTierModel.updateOne(
      { _id: item.refId, reserved: { $gte: item.quantity } },
      { $inc: { reserved: -item.quantity } },
      { session },
    );
  }
}

async function explainUnavailable(tierId: string, eventId: Types.ObjectId): Promise<never> {
  const tier = await TicketTierModel.findOne({ _id: tierId, eventId });
  if (!tier) throw AppError.notFound();
  if (tier.salesEndAt <= new Date()) throw AppError.conflict('SALES_CLOSED');
  throw AppError.conflict('TIER_SOLD_OUT', { available: Math.max(0, tier.quantity - tier.sold - tier.reserved) });
}

async function toOrderView(order: OrderDoc, lang: Language) {
  const [transaction, tickets, event] = await Promise.all([
    TransactionModel.findOne({ orderId: order._id, kind: 'payment' }).lean(),
    order.status === 'paid' && order.type === 'ticket'
      ? TicketModel.find({ orderId: order._id }).select('code tierId status').lean()
      : Promise.resolve([]),
    order.eventId
      ? EventModel.findById(order.eventId).select('title startAt venue city').lean()
      : Promise.resolve(null),
  ]);
  return {
    ...order.toJSON(),
    event: event
      ? { id: String(event._id), title: event.title, startAt: event.startAt, venue: event.venue, city: event.city }
      : null,
    payment: transaction
      ? {
          provider: transaction.provider,
          externalRef: transaction.externalRef,
          status: transaction.status,
          message: order.status === 'pending' ? t('messages.paymentPrompt', lang) : null,
        }
      : null,
    tickets: tickets.map((ticket) => ({
      id: String(ticket._id),
      code: ticket.code,
      tierId: String(ticket.tierId),
      status: ticket.status,
    })),
  };
}

const isDuplicateKey = (err: unknown) => (err as { code?: number }).code === 11000;

async function recordPayment(order: OrderDoc, externalRef: string, provider: PaymentProvider['name']) {
  try {
    return await TransactionModel.create({
      orderId: order._id,
      payeeId: order.payeeId,
      provider,
      externalRef,
      kind: 'payment',
      amount: order.amount,
      status: 'pending',
    });
  } catch (err) {
    if (!isDuplicateKey(err)) throw err;
    const existing = await TransactionModel.findOne({ externalRef });
    if (!existing) throw err;
    return existing;
  }
}

async function replayPurchase(buyerId: string, key: string, input: CreateTicketOrderBody, lang: Language) {
  const previous = await OrderModel.findOne({ buyerId, idempotencyKey: key });
  if (!previous) return null;
  const item = previous.items[0];
  const same =
    previous.type === 'ticket' &&
    String(previous.eventId) === input.eventId &&
    previous.items.length === 1 &&
    String(item?.refId) === input.tierId &&
    item?.quantity === input.quantity;
  if (!same) throw AppError.conflict('IDEMPOTENCY_KEY_REUSED');
  return { order: await toOrderView(previous, lang), replayed: true };
}

async function startCollection(order: OrderDoc, input: { phone: string }, description: string) {
  const provider = getPaymentProvider();
  let externalRef: string;
  try {
    ({ externalRef } = await provider.collect({
      reference: order.id,
      amount: order.amount,
      phone: input.phone,
      payerId: String(order.buyerId),
      description,
    }));
  } catch (err) {
    if (!(err instanceof PaymentOutcomeUnknownError)) {
      await releaseOrder(order.id, 'failed');
      throw err;
    }
    const found = await provider.findPayment(String(order.buyerId), order.id).catch(() => undefined);
    if (!found) {
      await releaseOrder(order.id, 'failed');
      if (found === undefined) await OrderModel.updateOne({ _id: order._id }, { paymentUncertain: true });
      throw err;
    }
    logger.warn(
      { orderId: order.id, externalRef: found.externalRef },
      'Recovered a payment request after a lost response',
    );
    externalRef = found.externalRef;
  }
  await recordPayment(order, externalRef, provider.name);
}

export async function createTicketOrder(
  buyerId: string,
  input: CreateTicketOrderBody,
  lang: Language,
  idempotencyKey?: string,
) {
  if (idempotencyKey) {
    const previous = await replayPurchase(buyerId, idempotencyKey, input, lang);
    if (previous) return previous;
  }

  const event = await EventModel.findById(input.eventId);
  if (!event || event.status !== 'published') throw AppError.badRequest('EVENT_NOT_PUBLISHED');

  const tier = await reserveTier(input.tierId, event._id, input.quantity);
  if (!tier) return explainUnavailable(input.tierId, event._id);
  const items = [{ refId: tier._id, refModel: 'TicketTier', quantity: input.quantity, unitPrice: tier.price }];
  const amount = tier.price * input.quantity;

  let order: OrderDoc;
  try {
    order = await OrderModel.create({
      type: 'ticket',
      buyerId,
      payeeId: event.organizerId,
      eventId: event._id,
      items,
      amount,
      phone: input.phone,
      status: 'pending',
      expiresAt: minutesFromNow(RESERVATION_MINUTES),
      ...(idempotencyKey && { idempotencyKey }),
    });
  } catch (err) {
    await releaseItems(items);
    if (idempotencyKey && isDuplicateKey(err)) {
      const previous = await replayPurchase(buyerId, idempotencyKey, input, lang);
      if (previous) return previous;
    }
    throw err;
  }

  if (amount === 0) {
    await fulfillOrder(order.id);
  } else {
    await startCollection(
      order,
      input,
      `${input.quantity} × ${tier.name.toUpperCase()} – ${eventTitle(event.title, lang)}`,
    );
  }
  return { order: await toOrderView((await OrderModel.findById(order._id))!, lang), replayed: false };
}

async function replayBookingPayment(buyerId: string, key: string, bookingId: string, lang: Language) {
  const previous = await OrderModel.findOne({ buyerId, idempotencyKey: key });
  if (!previous) return null;
  if (previous.type !== 'service' || String(previous.items[0]?.refId) !== bookingId) {
    throw AppError.conflict('IDEMPOTENCY_KEY_REUSED');
  }
  return { order: await toOrderView(previous, lang), replayed: true };
}

export async function createBookingOrder(
  buyerId: string,
  input: CreateBookingOrderBody,
  lang: Language,
  idempotencyKey?: string,
) {
  if (idempotencyKey) {
    const previous = await replayBookingPayment(buyerId, idempotencyKey, input.bookingId, lang);
    if (previous) return previous;
  }

  const { booking, payeeId, title } = await findPayableBooking(buyerId, input.bookingId);
  const amount = booking.amount!;
  let order: OrderDoc;
  try {
    order = await OrderModel.create({
      type: 'service',
      buyerId,
      payeeId,
      ...(booking.eventId && { eventId: booking.eventId }),
      items: [{ refId: booking._id, refModel: 'Booking', quantity: 1, unitPrice: amount }],
      amount,
      phone: input.phone,
      status: 'pending',
      expiresAt: minutesFromNow(RESERVATION_MINUTES),
      ...(idempotencyKey && { idempotencyKey }),
    });
  } catch (err) {
    if (idempotencyKey && isDuplicateKey(err)) {
      const previous = await replayBookingPayment(buyerId, idempotencyKey, input.bookingId, lang);
      if (previous) return previous;
    }
    throw err;
  }

  if (!(await linkOrder(booking, order._id))) {
    await OrderModel.updateOne({ _id: order._id, status: 'pending' }, { status: 'failed' });
    throw AppError.conflict('BOOKING_NOT_PAYABLE');
  }
  await startCollection(order, input, `Tikly booking – ${title}`.slice(0, 200));
  return { order: await toOrderView((await OrderModel.findById(order._id))!, lang), replayed: false };
}

async function replaySlotPurchase(buyerId: string, key: string, input: CreateSlotOrderBody, lang: Language) {
  const previous = await OrderModel.findOne({ buyerId, idempotencyKey: key });
  if (!previous) return null;
  const item = previous.items[0];
  const same =
    previous.type === 'slot' &&
    previous.items.length === 1 &&
    String(item?.refId) === input.slotId &&
    item?.quantity === input.quantity;
  if (!same) throw AppError.conflict('IDEMPOTENCY_KEY_REUSED');
  return { order: await toOrderView(previous, lang), replayed: true };
}

export async function createSlotOrder(
  buyerId: string,
  input: CreateSlotOrderBody,
  lang: Language,
  idempotencyKey?: string,
) {
  if (idempotencyKey) {
    const previous = await replaySlotPurchase(buyerId, idempotencyKey, input, lang);
    if (previous) return previous;
  }

  const { slot, event } = await findBookableSlot(input.slotId);
  const reserved = await reserveSlot(slot._id, input.quantity);
  if (!reserved) {
    const current = await SlotModel.findById(slot._id).lean();
    throw AppError.conflict('SLOT_SOLD_OUT', {
      available: current ? Math.max(0, current.quantity - current.booked - current.reserved) : 0,
    });
  }
  const items = [{ refId: slot._id, refModel: 'Slot', quantity: input.quantity, unitPrice: slot.price }];
  const amount = slot.price * input.quantity;

  let order: OrderDoc;
  try {
    order = await withTransaction(async (session) => {
      const [created] = await OrderModel.create(
        [
          {
            type: 'slot',
            buyerId,
            payeeId: event.organizerId,
            eventId: event._id,
            items,
            amount,
            phone: input.phone,
            status: 'pending',
            expiresAt: minutesFromNow(RESERVATION_MINUTES),
            ...(idempotencyKey && { idempotencyKey }),
          },
        ],
        { session },
      );
      await SlotBookingModel.create(
        [{ slotId: slot._id, exhibitorId: buyerId, orderId: created!._id, quantity: input.quantity }],
        { session },
      );
      return created!;
    });
  } catch (err) {
    await releaseSlots(items);
    if (idempotencyKey && isDuplicateKey(err)) {
      const previous = await replaySlotPurchase(buyerId, idempotencyKey, input, lang);
      if (previous) return previous;
    }
    throw err;
  }

  if (amount === 0) {
    await fulfillOrder(order.id);
  } else {
    await startCollection(order, input, `${input.quantity} × ${slot.label} – ${eventTitle(event.title, lang)}`);
  }
  return { order: await toOrderView((await OrderModel.findById(order._id))!, lang), replayed: false };
}

async function issueTickets(order: OrderDoc, session: ClientSession) {
  for (const item of order.items) {
    const moved = await TicketTierModel.updateOne(
      { _id: item.refId, reserved: { $gte: item.quantity } },
      { $inc: { reserved: -item.quantity, sold: item.quantity } },
      { session },
    );
    if (moved.modifiedCount === 0) throw new Error(`Reserved stock missing for order ${order.id}`);
    const tickets = Array.from({ length: item.quantity }, () => {
      const _id = new Types.ObjectId();
      return {
        _id,
        code: ticketCode(),
        qrToken: createQrToken(String(_id)),
        orderId: order._id,
        eventId: order.eventId,
        tierId: item.refId,
        holderId: order.buyerId,
      };
    });
    await TicketModel.insertMany(tickets, { session });
  }
}

async function secureLapsedItems(order: OrderDoc, session: ClientSession) {
  const taken: OrderItem[] = [];
  for (const item of order.items) {
    const reserved = await reserveTier(item.refId, order.eventId!, item.quantity, session);
    if (!reserved) {
      await releaseItems(taken, session);
      return false;
    }
    taken.push(item);
  }
  return true;
}

async function claimForPayment(orderId: string, session: ClientSession) {
  const paidAt = new Date();
  const pending = await OrderModel.findOneAndUpdate(
    { _id: orderId, status: 'pending' },
    { status: 'paid', paidAt },
    { new: true, session },
  );
  if (pending) {
    if (pending.type === 'service' && !(await markBookingPaid(pending, session))) {
      await OrderModel.updateOne({ _id: pending._id }, { status: 'failed', $unset: { paidAt: 1 } }, { session });
      return { unfulfillable: pending };
    }
    return { order: pending };
  }

  const lapsed = await OrderModel.findOne({ _id: orderId, status: { $in: ['expired', 'failed'] } }).session(session);
  if (!lapsed) return null;
  const secured =
    lapsed.type === 'service'
      ? await markBookingPaid(lapsed, session)
      : lapsed.type === 'slot'
        ? await reserveSlotsAgain(lapsed, session)
        : await secureLapsedItems(lapsed, session);
  if (!secured) return { unfulfillable: lapsed };
  const revived = await OrderModel.findOneAndUpdate(
    { _id: orderId, status: lapsed.status },
    { status: 'paid', paidAt },
    { new: true, session },
  );
  return revived ? { order: revived } : null;
}

export async function fulfillOrder(orderId: string) {
  const outcome = await withTransaction(async (session) => {
    const claim = await claimForPayment(orderId, session);
    if (!claim?.order) return claim;
    const { order } = claim;
    const { commission, payeeShare } = splitAmount(order.amount, await getCommissionRate(order.type));
    await TransactionModel.updateOne(
      { orderId: order._id, kind: 'payment' },
      { status: 'successful', commission, payeeShare, payeeId: order.payeeId },
      { session },
    );
    if (order.type === 'ticket') await issueTickets(order, session);
    if (order.type === 'slot') await confirmSlots(order, session);
    return claim;
  });

  if (outcome?.order) {
    void deliverOrder(outcome.order).catch((err) => logger.error({ err, orderId }, 'Order delivery failed'));
  } else if (outcome?.unfulfillable) {
    await refundUnfulfillable(outcome.unfulfillable);
  }
  return outcome?.order ?? null;
}

async function refundUnfulfillable(order: OrderDoc) {
  const payment = await TransactionModel.findOneAndUpdate(
    { orderId: order._id, kind: 'payment', status: 'pending' },
    { status: 'successful', commission: 0, payeeShare: 0 },
    { new: true },
  );
  if (!payment) return;
  try {
    const { externalRef } = await getPaymentProvider().disburse({
      reference: `refund-${order.id}`,
      amount: order.amount,
      phone: order.phone!,
      description: REFUND_REASONS[order.type],
    });
    await TransactionModel.create({
      orderId: order._id,
      provider: payment.provider,
      externalRef,
      kind: 'refund',
      amount: order.amount,
      status: 'pending',
    });
    await OrderModel.updateOne({ _id: order._id }, { status: 'refunded' });
    if (order.type === 'service') {
      await bookingRefunded(order);
    } else {
      await notifyUsers(
        [String(order.buyerId)],
        order.type === 'slot' ? 'slot_refunded' : 'ticket_refunded',
        { orderId: order.id, amount: order.amount },
        String(order.eventId),
      );
    }
  } catch (err) {
    logger.error({ err, orderId: order.id, amount: order.amount }, 'Late payment could not be refunded automatically');
  }
}

export async function releaseOrder(orderId: string, status: 'failed' | 'expired') {
  await withTransaction(async (session) => {
    const order = await OrderModel.findOneAndUpdate(
      { _id: orderId, status: 'pending' },
      { status },
      { new: true, session },
    );
    if (!order) return;
    if (order.type === 'ticket') await releaseItems(order.items, session);
    if (order.type === 'slot') await closeSlotBooking(order, status, session);
    if (status === 'failed') {
      await TransactionModel.updateOne(
        { orderId: order._id, kind: 'payment', status: 'pending' },
        { status: 'failed' },
        { session },
      );
    }
  });
}

export const failOrder = (orderId: string) => releaseOrder(orderId, 'failed');

export async function syncPayment(orderId: string, transaction?: TransactionDoc | null) {
  const payment = transaction ?? (await TransactionModel.findOne({ orderId, kind: 'payment' }));
  if (!payment || payment.status !== 'pending') return;
  const status = await getPaymentProvider().getStatus(payment.externalRef);
  if (status === 'successful') await fulfillOrder(orderId);
  if (status === 'failed') {
    await failOrder(orderId);
    await TransactionModel.updateOne({ _id: payment._id, status: 'pending' }, { status: 'failed' });
  }
}

export async function adoptPayment(externalRef: string) {
  const provider = getPaymentProvider();
  const payment = await provider.getPayment(externalRef);
  if (!payment.reference || !Types.ObjectId.isValid(payment.reference)) return null;
  const order = await OrderModel.findById(payment.reference);
  if (!order) return null;
  const mismatch =
    (payment.amount !== undefined && payment.amount !== order.amount) ||
    (payment.payerId !== undefined && payment.payerId !== String(order.buyerId));
  if (mismatch) {
    logger.error({ externalRef, orderId: order.id, amount: payment.amount }, 'Payment does not match its order');
    return null;
  }
  const existing = await TransactionModel.findOne({ orderId: order._id, kind: 'payment' });
  if (existing && existing.externalRef !== externalRef) {
    logger.error(
      { externalRef, orderId: order.id, known: existing.externalRef },
      'A second payment arrived for one order; refund it manually',
    );
    return null;
  }
  const transaction = existing ?? (await recordPayment(order, externalRef, provider.name));
  await OrderModel.updateOne({ _id: order._id }, { $unset: { paymentUncertain: 1 } });
  logger.warn({ externalRef, orderId: order.id }, 'Adopted a payment the order did not know about');
  return transaction;
}

async function deliverOrder(order: OrderDoc) {
  if (order.type === 'service') return announceBookingPaid(order);
  if (order.type === 'slot') return announceSlotsBooked(order);
  const [buyer, event, tickets] = await Promise.all([
    UserModel.findById(order.buyerId).select('name email language').lean(),
    EventModel.findById(order.eventId).select('title startAt venue city').lean(),
    TicketModel.find({ orderId: order._id }).select('code qrToken tierId').lean(),
  ]);
  if (!buyer || !event) return;
  const tiers = await TicketTierModel.find({ _id: { $in: tickets.map((ticket) => ticket.tierId) } })
    .select('name')
    .lean();
  const tierName = new Map(tiers.map((tier) => [String(tier._id), tier.name as TierName]));
  const lang = (buyer.language ?? 'en') as Language;

  await notifyUsers(
    [String(buyer._id)],
    'ticket_purchased',
    { orderId: order.id, tickets: tickets.length },
    String(event._id),
  );
  if (buyer.email) {
    const unitPrice = new Map(order.items.map((item) => [String(item.refId), item.unitPrice]));
    const pdf = await buildTicketsPdf(
      tickets.map((ticket) => ({
        code: ticket.code,
        qrToken: ticket.qrToken,
        tier: tierName.get(String(ticket.tierId)) ?? 'standard',
        price: unitPrice.get(String(ticket.tierId)) ?? 0,
        holderName: buyer.name,
        eventTitle: eventTitle(event.title, lang),
        startAt: event.startAt,
        venue: event.venue,
        city: event.city,
      })),
      lang,
    );
    await sendMail({
      attachments: [{ filename: 'tikly-tickets.pdf', content: pdf, contentType: 'application/pdf' }],
      to: buyer.email,
      template: 'ticket_purchased',
      lang,
      data: {
        name: buyer.name,
        eventTitle: eventTitle(event.title, lang),
        startAt: event.startAt,
        venue: event.venue,
        city: event.city,
        amount: order.amount,
        tickets: tickets.map((ticket) => ({
          code: ticket.code,
          tier: tierName.get(String(ticket.tierId)) ?? 'standard',
        })),
      },
    });
  }
}

async function findOwnOrder(orderId: string, viewer: Viewer) {
  const order = await OrderModel.findById(orderId);
  if (!order || (viewer.role !== 'admin' && String(order.buyerId) !== viewer.id)) throw AppError.notFound();
  return order;
}

export async function getOrder(orderId: string, viewer: Viewer, lang: Language) {
  return toOrderView(await findOwnOrder(orderId, viewer), lang);
}

export async function verifyOrder(orderId: string, viewer: Viewer, lang: Language) {
  const order = await findOwnOrder(orderId, viewer);
  if (['pending', 'expired', 'failed'].includes(order.status)) await syncPayment(order.id);
  return toOrderView((await OrderModel.findById(order._id))!, lang);
}

export async function listMyOrders(buyerId: string, query: ListMyOrdersQuery, lang: Language) {
  const filter: FilterQuery<Order> = { buyerId };
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  const [orders, total] = await Promise.all([
    OrderModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(query)).limit(query.limit),
    OrderModel.countDocuments(filter),
  ]);
  return { items: await Promise.all(orders.map((order) => toOrderView(order, lang))), total };
}

export async function expireDueOrders(now = new Date(), batch = 50) {
  const due = await OrderModel.find({ status: 'pending', expiresAt: { $lte: now } })
    .sort({ expiresAt: 1 })
    .limit(batch)
    .select('_id');
  for (const { id } of due) {
    try {
      await syncPayment(id);
    } catch (err) {
      logger.warn({ err, orderId: id }, 'Payment status check failed before expiry');
    }
    await releaseOrder(id, 'expired');
    const order = await OrderModel.findById(id).select('status amount');
    if (order?.status === 'expired' && order.amount > 0) {
      const known = await TransactionModel.exists({ orderId: id, kind: 'payment' });
      if (!known) await OrderModel.updateOne({ _id: id }, { paymentUncertain: true });
    }
  }
  return due.length;
}

export async function reconcilePayments(now = new Date(), batch = 50) {
  const since = new Date(now.getTime() - RECONCILE_WINDOW_HOURS * 60 * 60 * 1000);
  const settledBefore = new Date(now.getTime() - RESERVATION_MINUTES * 60 * 1000);
  const provider = getPaymentProvider();
  let checked = 0;

  const lingering = await TransactionModel.find({
    kind: 'payment',
    status: 'pending',
    createdAt: { $gte: since, $lte: settledBefore },
  })
    .sort({ updatedAt: 1 })
    .limit(batch);
  for (const payment of lingering) {
    const order = await OrderModel.findById(payment.orderId).select('status');
    if (!order || order.status === 'pending') continue;
    try {
      await syncPayment(order.id, payment);
      checked += 1;
    } catch (err) {
      logger.warn({ err, orderId: order.id }, 'Payment reconciliation failed');
    }
    await TransactionModel.updateOne({ _id: payment._id }, { $set: { updatedAt: new Date() } });
  }

  const uncertain = await OrderModel.find({
    status: { $in: ['failed', 'expired'] },
    paymentUncertain: true,
    createdAt: { $gte: since },
  })
    .sort({ updatedAt: 1 })
    .limit(batch);
  for (const order of uncertain) {
    try {
      const found = await provider.findPayment(String(order.buyerId), order.id);
      checked += 1;
      if (!found) {
        await OrderModel.updateOne({ _id: order._id }, { $unset: { paymentUncertain: 1 } });
        continue;
      }
      const payment = await recordPayment(order, found.externalRef, provider.name);
      await OrderModel.updateOne({ _id: order._id }, { $unset: { paymentUncertain: 1 } });
      await syncPayment(order.id, payment);
    } catch (err) {
      logger.warn({ err, orderId: order.id }, 'Uncertain payment lookup failed');
      await OrderModel.updateOne({ _id: order._id }, { $set: { updatedAt: new Date() } });
    }
  }
  return checked;
}
