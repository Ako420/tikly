import { Types } from 'mongoose';
import { MIN_PAYMENT_AMOUNT, REFUND_CUTOFF_HOURS, REFUND_PERCENT } from '../config/constants';
import { logger } from '../lib/logger';
import { PaymentOutcomeUnknownError } from '../lib/payment/errors';
import { getPaymentProvider } from '../lib/payment/provider';
import { buildTicketsPdf } from '../lib/pdf';
import {
  EventModel,
  OrderModel,
  TicketModel,
  TicketTierModel,
  TransactionModel,
  UserModel,
  type TicketDoc,
} from '../model';
import type { MyTicketsQuery } from '../schema/ticket.schema';
import type { EventStatus, Language, Role, TierName } from '../types/enums';
import { AppError } from '../util/AppError';
import { skipFor } from '../util/pagination';
import { notifyUsers } from './notification.service';

type Viewer = { id: string; role: Role };
type Bilingual = { en?: string | null; fr?: string | null } | null | undefined;
type EventSummary = {
  _id: Types.ObjectId;
  title?: Bilingual;
  startAt: Date;
  endAt: Date;
  venue: string;
  city: string;
  coverUrl?: string | null;
  status: string;
};
type TierSummary = { _id: Types.ObjectId; name: string; price: number };
type TicketLike = {
  _id: Types.ObjectId;
  code: string;
  qrToken: string;
  status: string;
  orderId?: Types.ObjectId | null;
  checkIns?: { at: Date; type?: string | null }[] | null;
  createdAt?: Date;
};

const HOUR = 60 * 60 * 1000;

const titleIn = (title: Bilingual, lang: Language) =>
  (lang === 'fr' ? title?.fr || title?.en : title?.en || title?.fr) ?? '';

function refundBlocker(ticket: { status: string }, event: { status: string; startAt: Date }, now = new Date()) {
  if (ticket.status !== 'valid' || (event.status as EventStatus) !== 'published') return 'TICKET_NOT_REFUNDABLE';
  if (event.startAt.getTime() - now.getTime() <= REFUND_CUTOFF_HOURS * HOUR) return 'REFUND_WINDOW_CLOSED';
  return null;
}

function toTicketView(ticket: TicketLike, event: EventSummary, tier: TierSummary) {
  return {
    id: String(ticket._id),
    code: ticket.code,
    qrToken: ticket.qrToken,
    status: ticket.status,
    orderId: String(ticket.orderId),
    checkIns: (ticket.checkIns ?? []).map((checkIn) => ({ at: checkIn.at, type: checkIn.type ?? 'entry' })),
    tier: { id: String(tier._id), name: tier.name, price: tier.price },
    event: {
      id: String(event._id),
      title: event.title,
      startAt: event.startAt,
      endAt: event.endAt,
      venue: event.venue,
      city: event.city,
      coverUrl: event.coverUrl ?? undefined,
      status: event.status,
    },
    refundable: refundBlocker(ticket, event) === null,
    createdAt: ticket.createdAt,
  };
}

export async function listMyTickets(holderId: string, query: MyTicketsQuery) {
  const now = new Date();
  const upcoming = query.when === 'upcoming';
  const [result] = await TicketModel.aggregate<{
    items: (TicketLike & { event: EventSummary; tier: TierSummary })[];
    total: { count: number }[];
  }>([
    { $match: { holderId: new Types.ObjectId(holderId) } },
    { $lookup: { from: EventModel.collection.name, localField: 'eventId', foreignField: '_id', as: 'event' } },
    { $unwind: '$event' },
    { $match: { 'event.endAt': upcoming ? { $gte: now } : { $lt: now } } },
    { $lookup: { from: TicketTierModel.collection.name, localField: 'tierId', foreignField: '_id', as: 'tier' } },
    { $unwind: '$tier' },
    { $sort: { 'event.startAt': upcoming ? 1 : -1, _id: 1 } },
    { $facet: { items: [{ $skip: skipFor(query) }, { $limit: query.limit }], total: [{ $count: 'count' }] } },
  ]);
  return {
    items: (result?.items ?? []).map((ticket) => toTicketView(ticket, ticket.event, ticket.tier)),
    total: result?.total[0]?.count ?? 0,
  };
}

async function findTicket(ticketId: string, viewer: Viewer, allowAdmin = true) {
  const ticket = await TicketModel.findById(ticketId);
  const isHolder = ticket && String(ticket.holderId) === viewer.id;
  if (!ticket || (!isHolder && !(allowAdmin && viewer.role === 'admin'))) throw AppError.notFound();
  const [event, tier] = await Promise.all([
    EventModel.findById(ticket.eventId).lean<EventSummary>(),
    TicketTierModel.findById(ticket.tierId).lean<TierSummary>(),
  ]);
  if (!event || !tier) throw AppError.notFound();
  return { ticket, event, tier };
}

export async function getTicket(ticketId: string, viewer: Viewer) {
  const { ticket, event, tier } = await findTicket(ticketId, viewer);
  return toTicketView(ticket, event, tier);
}

export async function ticketPdf(ticketId: string, viewer: Viewer) {
  const { ticket, event, tier } = await findTicket(ticketId, viewer);
  const holder = await UserModel.findById(ticket.holderId).select('name language').lean();
  const lang = (holder?.language ?? 'en') as Language;
  const pdf = await buildTicketsPdf(
    [
      {
        code: ticket.code,
        qrToken: ticket.qrToken,
        tier: tier.name as TierName,
        price: tier.price,
        holderName: holder?.name ?? '',
        eventTitle: titleIn(event.title, lang),
        startAt: event.startAt,
        venue: event.venue,
        city: event.city,
      },
    ],
    lang,
  );
  return { filename: `tikly-${ticket.code}.pdf`, pdf };
}

async function sendRefund(ticket: TicketDoc, amount: number) {
  const order = await OrderModel.findById(ticket.orderId);
  if (!order?.phone) throw AppError.conflict('TICKET_NOT_REFUNDABLE');
  const provider = getPaymentProvider();
  const { externalRef } = await provider.disburse({
    reference: `refund-${ticket.id}`,
    amount,
    phone: order.phone,
    description: `Tikly refund ${ticket.code}`,
  });
  await TransactionModel.create({
    orderId: order._id,
    payeeId: order.payeeId,
    provider: provider.name,
    externalRef,
    kind: 'refund',
    amount,
    status: 'pending',
  });
}

async function unitPriceOf(ticket: TicketDoc, fallback: number) {
  const order = await OrderModel.findById(ticket.orderId).select('items').lean();
  const item = order?.items.find((entry) => String(entry.refId) === String(ticket.tierId));
  return item?.unitPrice ?? fallback;
}

export async function cancelTicket(ticketId: string, viewer: Viewer) {
  const { ticket, event, tier } = await findTicket(ticketId, viewer, false);
  const blocker = refundBlocker(ticket, event);
  if (blocker) throw AppError.conflict(blocker);

  const refund = Math.floor(((await unitPriceOf(ticket, tier.price)) * REFUND_PERCENT) / 100);
  if (refund > 0) {
    if (!getPaymentProvider().payoutsEnabled) throw new AppError(503, 'PAYOUTS_NOT_CONFIGURED');
    if (refund < MIN_PAYMENT_AMOUNT) throw AppError.conflict('REFUND_BELOW_MINIMUM', { refund });
  }

  const claimed = await TicketModel.findOneAndUpdate(
    { _id: ticket._id, status: 'valid' },
    { status: refund > 0 ? 'refunded' : 'cancelled' },
    { new: true },
  );
  if (!claimed) throw AppError.conflict('TICKET_NOT_REFUNDABLE');

  if (refund > 0) {
    try {
      await sendRefund(claimed, refund);
    } catch (err) {
      if (!(err instanceof PaymentOutcomeUnknownError)) {
        await TicketModel.updateOne({ _id: ticket._id, status: 'refunded' }, { status: 'valid' });
        throw err;
      }
      logger.error(
        { ticketId: ticket.id, amount: refund },
        'Refund payout outcome unknown; check Fapshi before refunding again',
      );
    }
  }

  await TicketTierModel.updateOne({ _id: ticket.tierId, sold: { $gte: 1 } }, { $inc: { sold: -1 } });
  await notifyUsers(
    [String(ticket.holderId)],
    'ticket_refunded',
    { ticketId: ticket.id, code: ticket.code, amount: refund },
    String(event._id),
  );
  return { ticket: toTicketView(claimed, event, tier), refund: { amount: refund } };
}
