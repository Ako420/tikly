import type { RequestHandler } from 'express';
import { Types } from 'mongoose';
import nodemailer from 'nodemailer';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/rateLimit', () => {
  const pass: RequestHandler = (_req, _res, next) => next();
  return { authLimiter: pass, paymentLimiter: pass };
});

import { buildApp } from '../src/app';
import { setMailTransport } from '../src/lib/mailer';
import { setPaymentProvider } from '../src/lib/payment/provider';
import {
  EventModel,
  NotificationModel,
  OrderModel,
  TicketModel,
  TicketTierModel,
  TransactionModel,
} from '../src/model';
import { createQrToken } from '../src/util/qrToken';
import { useTestDatabase } from './helpers/db';
import { fakeFapshi } from './helpers/fapshi';
import { createEvent, createTier, createUser, daysFromNow } from './helpers/factories';

useTestDatabase('tickets');

const app = buildApp();
const api = '/api/v1';
let fapshi = fakeFapshi();
type SentMail = { to: string; attachments: { filename: string; content: Buffer }[] };
let sent: SentMail[] = [];

beforeEach(() => {
  fapshi = fakeFapshi();
  setPaymentProvider(fapshi.provider);
  sent = [];
  const transport = nodemailer.createTransport({ jsonTransport: true });
  const original = transport.sendMail.bind(transport);
  transport.sendMail = (async (mail: Parameters<typeof original>[0]) => {
    sent.push({
      to: String(mail.to),
      attachments: (mail.attachments ?? []).map((a) => ({
        filename: String(a.filename),
        content: a.content as Buffer,
      })),
    });
    return original(mail);
  }) as typeof transport.sendMail;
  setMailTransport(transport);
});

afterAll(() => setPaymentProvider(undefined));

let counter = 0;

async function holding(options: { price?: number; status?: string; startInDays?: number; eventStatus?: string } = {}) {
  const buyer = await createUser('attendee', { name: 'Ama Ngono' });
  const organizer = await createUser('organizer');
  const start = options.startInDays ?? 30;
  const event = await createEvent(organizer.user._id, {
    status: options.eventStatus ?? 'published',
    startAt: daysFromNow(start),
    endAt: daysFromNow(start + 0.2),
    ...(options.eventStatus === 'cancelled' && { cancellationReason: 'x' }),
  });
  if (start <= 0) {
    await EventModel.collection.updateOne(
      { _id: event._id },
      { $set: { startAt: daysFromNow(start), endAt: daysFromNow(start + 0.2) } },
    );
  }
  const price = options.price ?? 15000;
  const tier = await createTier(event._id, {
    name: 'vip',
    price,
    sold: 1,
    salesEndAt: start > 1 ? daysFromNow(start - 1) : daysFromNow(1),
  });
  const order = await OrderModel.create({
    type: 'ticket',
    buyerId: buyer.user._id,
    payeeId: organizer.user._id,
    eventId: event._id,
    items: [{ refId: tier._id, refModel: 'TicketTier', quantity: 1, unitPrice: price }],
    amount: price,
    phone: '+237670000000',
    status: 'paid',
  });
  const _id = new Types.ObjectId();
  counter += 1;
  const ticket = await TicketModel.create({
    _id,
    code: `EVT-TEST-${String(counter).padStart(3, '0')}`,
    qrToken: createQrToken(String(_id)),
    orderId: order._id,
    eventId: event._id,
    tierId: tier._id,
    holderId: buyer.user._id,
    status: options.status ?? 'valid',
  });
  return { buyer, organizer, event, tier, order, ticket };
}

const cancel = (auth: Record<string, string>, id: string) => request(app).post(`${api}/tickets/${id}/cancel`).set(auth);

describe('GET /me/tickets', () => {
  it('lists upcoming tickets with the QR token, event and tier, soonest first', async () => {
    const later = await holding({ startInDays: 40 });
    const ticket = await TicketModel.create({
      ...later.ticket.toObject(),
      _id: new Types.ObjectId(),
      code: 'EVT-SOON-001',
      qrToken: 'x.y',
    });
    const soonEvent = await createEvent(later.organizer.user._id, {
      status: 'published',
      startAt: daysFromNow(5),
      endAt: daysFromNow(5.2),
    });
    await TicketModel.updateOne({ _id: ticket._id }, { eventId: soonEvent._id });
    const past = await createEvent(later.organizer.user._id, { status: 'completed' });
    await EventModel.collection.updateOne(
      { _id: past._id },
      { $set: { startAt: daysFromNow(-3), endAt: daysFromNow(-2.8) } },
    );
    await TicketModel.create({
      ...later.ticket.toObject(),
      _id: new Types.ObjectId(),
      code: 'EVT-PAST-001',
      qrToken: 'p.q',
      eventId: past._id,
    });
    await holding();

    const upcoming = await request(app).get(`${api}/me/tickets`).set(later.buyer.auth);
    expect(upcoming.status).toBe(200);
    expect(upcoming.body.data.map((t: { code: string }) => t.code)).toEqual(['EVT-SOON-001', later.ticket.code]);
    expect(upcoming.body.meta.total).toBe(2);
    expect(upcoming.body.data[1]).toMatchObject({
      qrToken: later.ticket.qrToken,
      status: 'valid',
      tier: { name: 'vip', price: 15000 },
      event: { id: later.event.id, city: 'Douala' },
      refundable: true,
    });

    const pastList = await request(app).get(`${api}/me/tickets?when=past`).set(later.buyer.auth);
    expect(pastList.body.data.map((t: { code: string }) => t.code)).toEqual(['EVT-PAST-001']);
  });

  it('is for attendees', async () => {
    expect(
      (
        await request(app)
          .get(`${api}/me/tickets`)
          .set((await createUser('organizer')).auth)
      ).status,
    ).toBe(403);
  });
});

describe('GET /tickets/:id', () => {
  it('shows a ticket to its holder and admins only', async () => {
    const { buyer, ticket } = await holding();
    expect((await request(app).get(`${api}/tickets/${ticket.id}`).set(buyer.auth)).body.data.code).toBe(ticket.code);
    expect(
      (
        await request(app)
          .get(`${api}/tickets/${ticket.id}`)
          .set((await createUser('attendee')).auth)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .get(`${api}/tickets/${ticket.id}`)
          .set((await createUser('admin')).auth)
      ).status,
    ).toBe(200);
  });
});

describe('GET /tickets/:id/pdf (TKT-6)', () => {
  it('downloads the ticket as a PDF', async () => {
    const { buyer, ticket } = await holding();
    const res = await request(app)
      .get(`${api}/tickets/${ticket.id}/pdf`)
      .set(buyer.auth)
      .buffer(true)
      .parse((response, done) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => done(null, Buffer.concat(chunks)));
      });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toBe(`attachment; filename="tikly-${ticket.code}.pdf"`);
    expect((res.body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('is private to the holder', async () => {
    const { ticket } = await holding();
    expect(
      (
        await request(app)
          .get(`${api}/tickets/${ticket.id}/pdf`)
          .set((await createUser('attendee')).auth)
      ).status,
    ).toBe(404);
  });
});

describe('PDF in the purchase email', () => {
  it('attaches one PDF with the tickets when an order is paid', async () => {
    const organizer = await createUser('organizer');
    const event = await createEvent(organizer.user._id, { status: 'published' });
    const free = await createTier(event._id, { price: 0 });
    const buyer = await createUser('attendee');
    await request(app)
      .post(`${api}/orders/tickets`)
      .set(buyer.auth)
      .send({ eventId: event.id, tierId: free.id, quantity: 2, phone: '670000000' });

    await vi.waitFor(() => expect(sent).toHaveLength(1), { timeout: 3000 });
    const [attachment] = sent[0]!.attachments;
    expect(attachment!.filename).toBe('tikly-tickets.pdf');
    expect(attachment!.content.subarray(0, 5).toString()).toBe('%PDF-');
  });
});

describe('POST /tickets/:id/cancel (TKT-8)', () => {
  it('refunds half the price to the paying phone and puts the seat back on sale', async () => {
    const { buyer, ticket, tier } = await holding({ price: 15001 });
    const res = await cancel(buyer.auth, ticket.id);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      ticket: { status: 'refunded', refundable: false },
      refund: { amount: 7500 },
    });
    expect(fapshi.callsTo('/payout')[0]!.body).toMatchObject({
      amount: 7500,
      phone: '670000000',
      externalId: `refund-${ticket.id}`,
    });
    expect(await TransactionModel.findOne({ kind: 'refund' })).toMatchObject({ amount: 7500, status: 'pending' });
    expect((await TicketTierModel.findById(tier._id))!.sold).toBe(0);
    expect(await NotificationModel.countDocuments({ type: 'ticket_refunded' })).toBe(1);
  });

  it('refunds only once when cancel is tapped twice at the same time', async () => {
    const { buyer, ticket } = await holding();
    const results = await Promise.all([cancel(buyer.auth, ticket.id), cancel(buyer.auth, ticket.id)]);
    expect(results.map((res) => res.status).sort()).toEqual([200, 409]);
    expect(fapshi.callsTo('/payout')).toHaveLength(1);
  });

  it('closes 48 hours before the event', async () => {
    const { buyer, ticket } = await holding({ startInDays: 1.5 });
    const res = await cancel(buyer.auth, ticket.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('REFUND_WINDOW_CLOSED');
    expect(fapshi.calls).toHaveLength(0);
  });

  it.each([
    ['a checked-in ticket', { status: 'checked_in' }],
    ['a refunded ticket', { status: 'refunded' }],
    ['a cancelled event', { eventStatus: 'cancelled' }],
  ])('refuses %s', async (_label, options) => {
    const { buyer, ticket } = await holding(options);
    const res = await cancel(buyer.auth, ticket.id);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TICKET_NOT_REFUNDABLE');
  });

  it('cancels a free ticket without a payout', async () => {
    const { buyer, ticket, tier } = await holding({ price: 0 });
    const res = await cancel(buyer.auth, ticket.id);
    expect(res.body.data).toMatchObject({ ticket: { status: 'cancelled' }, refund: { amount: 0 } });
    expect(fapshi.calls).toHaveLength(0);
    expect((await TicketTierModel.findById(tier._id))!.sold).toBe(0);
  });

  it('refuses refunds below the 100 XAF mobile money minimum', async () => {
    const { buyer, ticket } = await holding({ price: 150 });
    const res = await cancel(buyer.auth, ticket.id);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'REFUND_BELOW_MINIMUM', details: { refund: 75 } });
  });

  it('keeps the ticket when payouts are not set up', async () => {
    setPaymentProvider(fakeFapshi({ payouts: false }).provider);
    const { buyer, ticket } = await holding();
    const res = await cancel(buyer.auth, ticket.id);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('PAYOUTS_NOT_CONFIGURED');
    expect((await TicketModel.findById(ticket._id))!.status).toBe('valid');
  });

  it('gives the ticket back when Fapshi refuses the payout', async () => {
    const { buyer, ticket, tier } = await holding();
    fapshi.failNext('/payout', 400, 'Insufficient balance');
    const res = await cancel(buyer.auth, ticket.id);
    expect(res.status).toBe(502);
    expect((await TicketModel.findById(ticket._id))!.status).toBe('valid');
    expect((await TicketTierModel.findById(tier._id))!.sold).toBe(1);
  });

  it('keeps the ticket refunded when the payout may have gone through', async () => {
    const { buyer, ticket } = await holding();
    fapshi.timeoutNext('/payout');
    const res = await cancel(buyer.auth, ticket.id);
    expect(res.status).toBe(200);
    expect((await TicketModel.findById(ticket._id))!.status).toBe('refunded');
  });

  it('is only for the holder', async () => {
    const { ticket } = await holding();
    expect((await cancel((await createUser('attendee')).auth, ticket.id)).status).toBe(404);
    expect((await cancel((await createUser('admin')).auth, ticket.id)).status).toBe(403);
  });
});
