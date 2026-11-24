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
  NotificationModel,
  OrderModel,
  SettingModel,
  TicketModel,
  TicketTierModel,
  TransactionModel,
} from '../src/model';
import { expireDueOrders, reconcilePayments } from '../src/service/order.service';
import { verifyQrToken } from '../src/util/qrToken';
import { useTestDatabase } from './helpers/db';
import { WEBHOOK_SECRET, fakeFapshi } from './helpers/fapshi';
import { createEvent, createTier, createUser, daysFromNow, objectId } from './helpers/factories';

useTestDatabase('orders');

const app = buildApp();
const api = '/api/v1';
let fapshi = fakeFapshi();

beforeEach(() => {
  fapshi = fakeFapshi();
  setPaymentProvider(fapshi.provider);
  setMailTransport(nodemailer.createTransport({ jsonTransport: true }));
});

afterAll(() => setPaymentProvider(undefined));

async function onSale(tier: Record<string, unknown> = {}) {
  const organizer = await createUser('organizer');
  const event = await createEvent(organizer.user._id, { status: 'published' });
  const vip = await createTier(event._id, { name: 'vip', price: 15000, quantity: 10, ...tier });
  return { organizer, event, vip };
}

const buy = (auth: Record<string, string>, body: Record<string, unknown>) =>
  request(app).post(`${api}/orders/tickets`).set(auth).send(body);

const webhook = (transId: string, status: string, secret = WEBHOOK_SECRET) =>
  request(app).post(`${api}/payments/webhook/fapshi`).set('x-wh-secret', secret).send({ transId, status });

async function settled(orderId: string, status: string) {
  await vi.waitFor(async () => expect((await OrderModel.findById(orderId))!.status).toBe(status), { timeout: 3000 });
}

describe('POST /orders/tickets', () => {
  it('reserves tickets for 10 minutes and sends the payment prompt (TKT-2, TKT-3)', async () => {
    const { event, vip } = await onSale();
    const buyer = await createUser('attendee');
    const before = Date.now();
    const res = await buy(buyer.auth, { eventId: event.id, tierId: vip.id, quantity: 2, phone: '670 00 00 00' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      type: 'ticket',
      status: 'pending',
      amount: 30000,
      phone: '+237670000000',
      buyerId: buyer.user.id,
      payment: {
        provider: 'fapshi',
        externalRef: 'tx1',
        status: 'pending',
        message: 'Confirm the payment on your phone.',
      },
      tickets: [],
      event: { id: event.id, city: 'Douala' },
    });
    const expiresIn = new Date(res.body.data.expiresAt).getTime() - before;
    expect(expiresIn).toBeGreaterThan(9.9 * 60_000);
    expect(expiresIn).toBeLessThanOrEqual(10 * 60_000 + 1000);
    expect((await TicketTierModel.findById(vip._id))!.reserved).toBe(2);
    expect(fapshi.callsTo('/direct-pay')[0]!.body).toMatchObject({
      amount: 30000,
      phone: '670000000',
      externalId: res.body.data.id,
    });
    expect(await TransactionModel.findOne({ externalRef: 'tx1' })).toMatchObject({
      kind: 'payment',
      status: 'pending',
      amount: 30000,
    });
  });

  it('gives free tickets at once without calling Fapshi', async () => {
    const { event } = await onSale();
    const free = await createTier(event._id, { name: 'standard', price: 0, quantity: 50 });
    const buyer = await createUser('attendee');
    const res = await buy(buyer.auth, { eventId: event.id, tierId: free.id, quantity: 3, phone: '670000000' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'paid', amount: 0, payment: null });
    expect(res.body.data.tickets).toHaveLength(3);
    expect(fapshi.calls).toHaveLength(0);
    expect(await TicketTierModel.findById(free._id)).toMatchObject({ sold: 3, reserved: 0 });
  });

  it('never sells more than the tier holds, even when many people buy at once (TKT-4)', async () => {
    const { event, vip } = await onSale({ quantity: 5 });
    const buyers = await Promise.all(Array.from({ length: 12 }, () => createUser('attendee')));
    const results = await Promise.all(
      buyers.map((buyer) => buy(buyer.auth, { eventId: event.id, tierId: vip.id, quantity: 1, phone: '670000000' })),
    );
    expect(results.filter((res) => res.status === 201)).toHaveLength(5);
    expect(results.filter((res) => res.status === 409).every((res) => res.body.error.code === 'TIER_SOLD_OUT')).toBe(
      true,
    );
    expect(await TicketTierModel.findById(vip._id)).toMatchObject({ reserved: 5, sold: 0 });
  });

  it('explains why tickets cannot be bought', async () => {
    const { event, vip } = await onSale({ quantity: 2, sold: 1 });
    const buyer = await createUser('attendee');
    const soldOut = await buy(buyer.auth, { eventId: event.id, tierId: vip.id, quantity: 2, phone: '670000000' });
    expect(soldOut.status).toBe(409);
    expect(soldOut.body.error).toMatchObject({ code: 'TIER_SOLD_OUT', details: { available: 1 } });

    await TicketTierModel.updateOne({ _id: vip._id }, { salesEndAt: daysFromNow(-1) });
    expect(
      (await buy(buyer.auth, { eventId: event.id, tierId: vip.id, quantity: 1, phone: '670000000' })).body.error.code,
    ).toBe('SALES_CLOSED');

    const draft = await createEvent(objectId());
    const draftTier = await createTier(draft._id);
    expect(
      (await buy(buyer.auth, { eventId: draft.id, tierId: draftTier.id, quantity: 1, phone: '670000000' })).body.error
        .code,
    ).toBe('EVENT_NOT_PUBLISHED');
    expect(
      (await buy(buyer.auth, { eventId: event.id, tierId: draftTier.id, quantity: 1, phone: '670000000' })).status,
    ).toBe(404);
  });

  it('checks the quantity, phone and role', async () => {
    const { event, vip } = await onSale();
    const buyer = await createUser('attendee');
    const res = await buy(buyer.auth, { eventId: event.id, tierId: vip.id, quantity: 11, phone: '12345' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.quantity.message).toBe('You can buy at most 10 tickets per order.');
    expect(res.body.error.details.phone.code).toBeDefined();
    const organizer = await createUser('organizer');
    expect(
      (await buy(organizer.auth, { eventId: event.id, tierId: vip.id, quantity: 1, phone: '670000000' })).status,
    ).toBe(403);
  });

  it('releases the tickets when Fapshi refuses the request', async () => {
    const { event, vip } = await onSale();
    const buyer = await createUser('attendee');
    fapshi.failNext('/direct-pay', 400, 'Invalid phone number');
    const res = await buy(buyer.auth, { eventId: event.id, tierId: vip.id, quantity: 2, phone: '670000000' });
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('PAYMENT_PROVIDER_ERROR');
    expect((await TicketTierModel.findById(vip._id))!.reserved).toBe(0);
    expect((await OrderModel.findOne())!.status).toBe('failed');
  });
});

describe('payment webhook (PAY-1 to PAY-4, REL-1)', () => {
  async function pendingOrder(quantity = 2) {
    const sale = await onSale();
    const buyer = await createUser('attendee', { language: 'fr' });
    const res = await buy(buyer.auth, { eventId: sale.event.id, tierId: sale.vip.id, quantity, phone: '670000000' });
    return { ...sale, buyer, order: res.body.data as { id: string; payment: { externalRef: string } } };
  }

  it('issues one signed ticket per seat and records the commission split', async () => {
    const { vip, order, organizer, buyer } = await pendingOrder(2);
    fapshi.setStatus(order.payment.externalRef, 'SUCCESSFUL');
    const res = await webhook(order.payment.externalRef, 'SUCCESSFUL');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    await settled(order.id, 'paid');

    const tickets = await TicketModel.find({ orderId: order.id }).lean();
    expect(tickets).toHaveLength(2);
    expect(new Set(tickets.map((ticket) => ticket.code)).size).toBe(2);
    for (const ticket of tickets) {
      expect(ticket.code).toMatch(/^EVT-[2-9A-Z]{4}-[2-9A-Z]{3}$/);
      expect(verifyQrToken(ticket.qrToken)).toBe(String(ticket._id));
      expect(String(ticket.holderId)).toBe(buyer.user.id);
    }
    expect(await TicketTierModel.findById(vip._id)).toMatchObject({ sold: 2, reserved: 0 });
    expect(await TransactionModel.findOne({ externalRef: order.payment.externalRef })).toMatchObject({
      status: 'successful',
      amount: 30000,
      commission: 3000,
      payeeShare: 27000,
      payeeId: organizer.user._id,
    });
    await vi.waitFor(async () => expect(await NotificationModel.countDocuments({ type: 'ticket_purchased' })).toBe(1));
  });

  it('issues tickets once however many times the webhook arrives', async () => {
    const { order } = await pendingOrder(3);
    fapshi.setStatus(order.payment.externalRef, 'SUCCESSFUL');
    await Promise.all([1, 2, 3].map(() => webhook(order.payment.externalRef, 'SUCCESSFUL')));
    await settled(order.id, 'paid');
    await webhook(order.payment.externalRef, 'SUCCESSFUL');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(await TicketModel.countDocuments({ orderId: order.id })).toBe(3);
  });

  it('uses the commission rate set by the admin', async () => {
    await SettingModel.create({ commission: { ticket: 15, service: 10, slot: 10 } });
    const { order } = await pendingOrder(2);
    fapshi.setStatus(order.payment.externalRef, 'SUCCESSFUL');
    await webhook(order.payment.externalRef, 'SUCCESSFUL');
    await settled(order.id, 'paid');
    expect(await TransactionModel.findOne({ externalRef: order.payment.externalRef })).toMatchObject({
      commission: 4500,
      payeeShare: 25500,
    });
  });

  it('trusts Fapshi’s status, not the webhook body', async () => {
    const { order } = await pendingOrder();
    await webhook(order.payment.externalRef, 'SUCCESSFUL');
    await vi.waitFor(() => expect(fapshi.callsTo('/payment-status')).toHaveLength(1));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect((await OrderModel.findById(order.id))!.status).toBe('pending');
    expect(await TicketModel.countDocuments()).toBe(0);
  });

  it('ignores webhooks without the shared secret', async () => {
    const { order } = await pendingOrder();
    fapshi.setStatus(order.payment.externalRef, 'SUCCESSFUL');
    expect((await webhook(order.payment.externalRef, 'SUCCESSFUL', 'wrong')).status).toBe(200);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fapshi.callsTo('/payment-status')).toHaveLength(0);
    expect((await OrderModel.findById(order.id))!.status).toBe('pending');
  });

  it('releases the tickets when the payment fails', async () => {
    const { vip, order } = await pendingOrder(2);
    fapshi.setStatus(order.payment.externalRef, 'FAILED');
    await webhook(order.payment.externalRef, 'FAILED');
    await settled(order.id, 'failed');
    expect((await TicketTierModel.findById(vip._id))!.reserved).toBe(0);
    expect((await TransactionModel.findOne({ externalRef: order.payment.externalRef }))!.status).toBe('failed');
  });

  it('answers 200 to unknown transactions and providers', async () => {
    expect((await webhook('nope', 'SUCCESSFUL')).status).toBe(200);
    expect((await request(app).post(`${api}/payments/webhook/campay`).send({})).status).toBe(200);
  });
});

describe('reading and verifying orders', () => {
  it('shows an order to its buyer and admins only, with tickets once paid', async () => {
    const { event } = await onSale();
    const free = await createTier(event._id, { name: 'standard', price: 0 });
    const buyer = await createUser('attendee');
    const order = (await buy(buyer.auth, { eventId: event.id, tierId: free.id, quantity: 1, phone: '670000000' })).body
      .data;

    const own = await request(app).get(`${api}/orders/${order.id}`).set(buyer.auth);
    expect(own.body.data.tickets).toHaveLength(1);
    expect(
      (
        await request(app)
          .get(`${api}/orders/${order.id}`)
          .set((await createUser('attendee')).auth)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .get(`${api}/orders/${order.id}`)
          .set((await createUser('admin')).auth)
      ).status,
    ).toBe(200);
  });

  it('settles a pending order when the buyer taps “I have paid”', async () => {
    const { event, vip } = await onSale();
    const buyer = await createUser('attendee');
    const order = (await buy(buyer.auth, { eventId: event.id, tierId: vip.id, quantity: 1, phone: '670000000' })).body
      .data;

    const still = await request(app).post(`${api}/orders/${order.id}/verify`).set(buyer.auth);
    expect(still.body.data.status).toBe('pending');
    fapshi.setStatus(order.payment.externalRef, 'SUCCESSFUL');
    const paid = await request(app).post(`${api}/orders/${order.id}/verify`).set(buyer.auth);
    expect(paid.body.data).toMatchObject({ status: 'paid', payment: { status: 'successful', message: null } });
    expect(paid.body.data.tickets).toHaveLength(1);
  });

  it('lists my orders, newest first, by status', async () => {
    const { event, vip } = await onSale();
    const free = await createTier(event._id, { name: 'standard', price: 0 });
    const buyer = await createUser('attendee');
    const first = (await buy(buyer.auth, { eventId: event.id, tierId: vip.id, quantity: 1, phone: '670000000' })).body
      .data;
    const second = (await buy(buyer.auth, { eventId: event.id, tierId: free.id, quantity: 1, phone: '670000000' })).body
      .data;
    await buy((await createUser('attendee')).auth, {
      eventId: event.id,
      tierId: free.id,
      quantity: 1,
      phone: '670000000',
    });

    const all = await request(app).get(`${api}/me/orders`).set(buyer.auth);
    expect(all.body.data.map((o: { id: string }) => o.id)).toEqual([second.id, first.id]);
    expect(all.body.meta.total).toBe(2);
    const paid = await request(app).get(`${api}/me/orders?status=paid`).set(buyer.auth);
    expect(paid.body.data.map((o: { id: string }) => o.id)).toEqual([second.id]);
  });
});

describe('expiry and late payments', () => {
  async function overdueOrder(quantity = 2, tier: Record<string, unknown> = {}) {
    const sale = await onSale(tier);
    const buyer = await createUser('attendee');
    const order = (await buy(buyer.auth, { eventId: sale.event.id, tierId: sale.vip.id, quantity, phone: '670000000' }))
      .body.data;
    await OrderModel.updateOne({ _id: order.id }, { expiresAt: new Date(Date.now() - 1000) });
    return { ...sale, buyer, order };
  }

  it('releases unpaid orders after 10 minutes (TKT-3)', async () => {
    const { vip, order } = await overdueOrder(2);
    expect(await expireDueOrders()).toBe(1);
    expect((await OrderModel.findById(order.id))!.status).toBe('expired');
    expect((await TicketTierModel.findById(vip._id))!.reserved).toBe(0);
    expect(fapshi.callsTo('/payment-status')).toHaveLength(1);
  });

  it('fulfils instead of expiring when the payment went through at the last moment', async () => {
    const { order } = await overdueOrder(1);
    fapshi.setStatus(order.payment.externalRef, 'SUCCESSFUL');
    await expireDueOrders();
    expect((await OrderModel.findById(order.id))!.status).toBe('paid');
    expect(await TicketModel.countDocuments({ orderId: order.id })).toBe(1);
  });

  it('still issues tickets for a payment that lands after expiry, if stock is left', async () => {
    const { vip, order } = await overdueOrder(2);
    await expireDueOrders();
    fapshi.setStatus(order.payment.externalRef, 'SUCCESSFUL');
    await webhook(order.payment.externalRef, 'SUCCESSFUL');
    await settled(order.id, 'paid');
    expect(await TicketModel.countDocuments({ orderId: order.id })).toBe(2);
    expect(await TicketTierModel.findById(vip._id)).toMatchObject({ sold: 2, reserved: 0 });
  });

  it('refunds a late payment in full when the tier sold out meanwhile', async () => {
    const { vip, order } = await overdueOrder(2, { quantity: 2 });
    await expireDueOrders();
    await TicketTierModel.updateOne({ _id: vip._id }, { sold: 2 });
    fapshi.setStatus(order.payment.externalRef, 'SUCCESSFUL');
    await webhook(order.payment.externalRef, 'SUCCESSFUL');
    await settled(order.id, 'refunded');

    expect(fapshi.callsTo('/payout')[0]!.body).toMatchObject({ amount: 30000, phone: '670000000' });
    expect(await TransactionModel.findOne({ kind: 'refund' })).toMatchObject({ amount: 30000 });
    expect(await TicketModel.countDocuments()).toBe(0);
    expect((await TicketTierModel.findById(vip._id))!.reserved).toBe(0);
  });
});

describe('lost responses and unknown payments', () => {
  async function sale() {
    const setup = await onSale();
    const buyer = await createUser('attendee');
    const body = { eventId: setup.event.id, tierId: setup.vip.id, quantity: 2, phone: '670000000' };
    return { ...setup, buyer, body };
  }

  it('keeps tracking the payment when Fapshi created it but the response was lost', async () => {
    const { buyer, body, vip } = await sale();
    fapshi.timeoutAfterCreating('/direct-pay');
    const res = await buy(buyer.auth, body);

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ status: 'pending', payment: { externalRef: 'tx1', status: 'pending' } });
    expect(fapshi.callsTo('/transaction/')[0]!.url).toContain(`/transaction/${buyer.user.id}`);
    expect(fapshi.callsTo('/direct-pay')).toHaveLength(1);
    expect((await TicketTierModel.findById(vip._id))!.reserved).toBe(2);
  });

  it('gives up cleanly when Fapshi confirms nothing was created', async () => {
    const { buyer, body, vip } = await sale();
    fapshi.timeoutNext('/direct-pay');
    const res = await buy(buyer.auth, body);

    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('PAYMENT_PROVIDER_ERROR');
    const order = (await OrderModel.findOne())!;
    expect(order.status).toBe('failed');
    expect(order.paymentUncertain).toBeUndefined();
    expect((await TicketTierModel.findById(vip._id))!.reserved).toBe(0);
  });

  it('settles a payment it never recorded when Fapshi’s webhook arrives', async () => {
    const { buyer, body } = await sale();
    fapshi.timeoutAfterCreating('/direct-pay');
    fapshi.timeoutNext('/transaction/');
    expect((await buy(buyer.auth, body)).status).toBe(502);
    const order = (await OrderModel.findOne())!;
    expect(order).toMatchObject({ status: 'failed', paymentUncertain: true });
    expect(await TransactionModel.countDocuments()).toBe(0);

    fapshi.setStatus('tx1', 'SUCCESSFUL');
    await webhook('tx1', 'SUCCESSFUL');
    await settled(order.id, 'paid');
    expect(await TicketModel.countDocuments({ orderId: order.id })).toBe(2);
    expect(await TransactionModel.findOne({ externalRef: 'tx1' })).toMatchObject({ status: 'successful' });
    expect((await OrderModel.findById(order.id))!.paymentUncertain).toBeUndefined();
  });

  it('finds that payment on its own when the webhook never comes', async () => {
    const { buyer, body } = await sale();
    fapshi.timeoutAfterCreating('/direct-pay');
    fapshi.timeoutNext('/transaction/');
    await buy(buyer.auth, body);
    const order = (await OrderModel.findOne())!;
    fapshi.setStatus('tx1', 'SUCCESSFUL');

    await reconcilePayments();
    expect((await OrderModel.findById(order.id))!.status).toBe('paid');
    expect(await TicketModel.countDocuments({ orderId: order.id })).toBe(2);
  });

  it('stops looking once Fapshi confirms an uncertain order was never sent', async () => {
    const { buyer, body } = await sale();
    fapshi.timeoutNext('/direct-pay');
    fapshi.timeoutNext('/transaction/');
    await buy(buyer.auth, body);
    expect((await OrderModel.findOne())!.paymentUncertain).toBe(true);

    await reconcilePayments();
    expect((await OrderModel.findOne())!.paymentUncertain).toBeUndefined();
    const lookups = fapshi.callsTo('/transaction/').length;
    await reconcilePayments();
    expect(fapshi.callsTo('/transaction/')).toHaveLength(lookups);
  });

  it('flags a pending order that has no recorded payment when it expires, then recovers it', async () => {
    const { buyer, body } = await sale();
    const created = (await buy(buyer.auth, body)).body.data;
    await TransactionModel.deleteMany({});
    await OrderModel.updateOne({ _id: created.id }, { expiresAt: new Date(Date.now() - 1000) });
    await expireDueOrders();
    expect((await OrderModel.findById(created.id))!.paymentUncertain).toBe(true);

    fapshi.setStatus('tx1', 'SUCCESSFUL');
    await reconcilePayments();
    expect((await OrderModel.findById(created.id))!.status).toBe('paid');
  });

  it('ignores a payment whose amount or payer does not match the order', async () => {
    const { buyer, body } = await sale();
    fapshi.timeoutNext('/direct-pay');
    fapshi.timeoutNext('/transaction/');
    await buy(buyer.auth, body);
    const order = (await OrderModel.findOne())!;
    const wrongAmount = fapshi.createExternally(
      { externalId: order.id, userId: buyer.user.id, amount: 100 },
      'SUCCESSFUL',
    );
    const wrongPayer = fapshi.createExternally(
      { externalId: order.id, userId: 'someone-else', amount: 30000 },
      'SUCCESSFUL',
    );

    await webhook(wrongAmount, 'SUCCESSFUL');
    await webhook(wrongPayer, 'SUCCESSFUL');
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect((await OrderModel.findById(order.id))!.status).toBe('failed');
    expect(await TransactionModel.countDocuments()).toBe(0);
  });
});

describe('late payments without a webhook', () => {
  async function expiredOrder() {
    const setup = await onSale();
    const buyer = await createUser('attendee');
    const order = (
      await buy(buyer.auth, { eventId: setup.event.id, tierId: setup.vip.id, quantity: 1, phone: '670000000' })
    ).body.data;
    await OrderModel.updateOne({ _id: order.id }, { expiresAt: new Date(Date.now() - 1000) });
    await expireDueOrders();
    await TransactionModel.collection.updateOne(
      { orderId: new Types.ObjectId(order.id) },
      { $set: { createdAt: new Date(Date.now() - 15 * 60_000) } },
    );
    return { ...setup, buyer, order };
  }

  it('issues the tickets when the buyer pays after expiry and the webhook is lost', async () => {
    const { order } = await expiredOrder();
    fapshi.setStatus(order.payment.externalRef, 'SUCCESSFUL');
    expect(await reconcilePayments()).toBe(1);
    expect((await OrderModel.findById(order.id))!.status).toBe('paid');
    expect(await TicketModel.countDocuments({ orderId: order.id })).toBe(1);
  });

  it('stops checking a payment once Fapshi says it failed', async () => {
    const { order } = await expiredOrder();
    fapshi.setStatus(order.payment.externalRef, 'FAILED');
    await reconcilePayments();
    expect((await TransactionModel.findOne({ orderId: order.id }))!.status).toBe('failed');
    const checks = fapshi.callsTo('/payment-status').length;
    await reconcilePayments();
    expect(fapshi.callsTo('/payment-status')).toHaveLength(checks);
  });

  it('lets the buyer’s “I have paid” button settle an expired order', async () => {
    const { order, buyer } = await expiredOrder();
    fapshi.setStatus(order.payment.externalRef, 'SUCCESSFUL');
    const res = await request(app).post(`${api}/orders/${order.id}/verify`).set(buyer.auth);
    expect(res.body.data.status).toBe('paid');
  });

  it('stops after 24 hours', async () => {
    const { order } = await expiredOrder();
    await TransactionModel.collection.updateOne(
      { orderId: new Types.ObjectId(order.id) },
      { $set: { createdAt: new Date(Date.now() - 25 * 60 * 60_000) } },
    );
    fapshi.setStatus(order.payment.externalRef, 'SUCCESSFUL');
    expect(await reconcilePayments()).toBe(0);
  });
});

describe('Idempotency-Key on purchase', () => {
  async function sale() {
    const setup = await onSale();
    const buyer = await createUser('attendee');
    const body = { eventId: setup.event.id, tierId: setup.vip.id, quantity: 2, phone: '670000000' };
    return { ...setup, buyer, body };
  }
  const buyWithKey = (auth: Record<string, string>, body: Record<string, unknown>, key: string) =>
    request(app).post(`${api}/orders/tickets`).set(auth).set('Idempotency-Key', key).send(body);

  it('returns the first order when the same purchase is retried', async () => {
    const { buyer, body, vip } = await sale();
    const first = await buyWithKey(buyer.auth, body, 'tap-0001-retry');
    const retry = await buyWithKey(buyer.auth, body, 'tap-0001-retry');

    expect(first.status).toBe(201);
    expect(retry.status).toBe(200);
    expect(retry.body.data.id).toBe(first.body.data.id);
    expect(fapshi.callsTo('/direct-pay')).toHaveLength(1);
    expect((await TicketTierModel.findById(vip._id))!.reserved).toBe(2);
  });

  it('creates one order when retries race each other', async () => {
    const { buyer, body, vip } = await sale();
    const results = await Promise.all([1, 2, 3].map(() => buyWithKey(buyer.auth, body, 'tap-race-0001')));
    expect(new Set(results.map((res) => res.body.data.id)).size).toBe(1);
    expect(await OrderModel.countDocuments()).toBe(1);
    expect((await TicketTierModel.findById(vip._id))!.reserved).toBe(2);
  });

  it('refuses the same key for a different purchase', async () => {
    const { buyer, body } = await sale();
    await buyWithKey(buyer.auth, body, 'tap-0002-other');
    const res = await buyWithKey(buyer.auth, { ...body, quantity: 3 }, 'tap-0002-other');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
  });

  it('keeps keys separate per buyer and checks their format', async () => {
    const { buyer, body } = await sale();
    const other = await createUser('attendee');
    const a = await buyWithKey(buyer.auth, body, 'shared-key-01');
    const b = await buyWithKey(other.auth, body, 'shared-key-01');
    expect(b.status).toBe(201);
    expect(b.body.data.id).not.toBe(a.body.data.id);

    const bad = await buyWithKey(buyer.auth, body, 'no spaces!');
    expect(bad.status).toBe(400);
    expect(bad.body.error.details['idempotency-key'].message).toBe(
      'The Idempotency-Key must be 8 to 100 letters, digits, - or _.',
    );
  });

  it('still works without a key', async () => {
    const { buyer, body } = await sale();
    expect((await buy(buyer.auth, body)).status).toBe(201);
    expect((await buy(buyer.auth, body)).status).toBe(201);
    expect(await OrderModel.countDocuments()).toBe(2);
  });
});
