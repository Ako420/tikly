import type { RequestHandler } from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/rateLimit', () => {
  const pass: RequestHandler = (_req, _res, next) => next();
  return { authLimiter: pass, paymentLimiter: pass };
});

import { buildApp } from '../src/app';
import { setPaymentProvider } from '../src/lib/payment/provider';
import { EventModel, NotificationModel, OrderModel, SlotBookingModel, SlotModel, TransactionModel } from '../src/model';
import { expireDueOrders } from '../src/service/order.service';
import { useTestDatabase } from './helpers/db';
import { WEBHOOK_SECRET, fakeFapshi } from './helpers/fapshi';
import { createEvent, createUser, daysFromNow } from './helpers/factories';

useTestDatabase('slots');

const app = buildApp();
const api = '/api/v1';
let fapshi = fakeFapshi();

beforeEach(() => {
  fapshi = fakeFapshi();
  setPaymentProvider(fapshi.provider);
});

afterAll(() => setPaymentProvider(undefined));

async function fair(status = 'published', slot: Record<string, unknown> = {}) {
  const organizer = await createUser('organizer');
  const event = await createEvent(organizer.user._id, { status });
  const stand = await SlotModel.create({
    eventId: event._id,
    label: 'Stand A',
    size: '3 x 3 m',
    price: 30000,
    quantity: 3,
    ...slot,
  });
  return { organizer, event, stand };
}

const buy = (auth: Record<string, string>, body: Record<string, unknown>) =>
  request(app).post(`${api}/orders/slots`).set(auth).send(body);

const webhook = (transId: string, status: string) =>
  request(app).post(`${api}/payments/webhook/fapshi`).set('x-wh-secret', WEBHOOK_SECRET).send({ transId, status });

async function settled(orderId: string, status: string) {
  await vi.waitFor(async () => expect((await OrderModel.findById(orderId))!.status).toBe(status), { timeout: 3000 });
}

describe('managing slots (EXH-1)', () => {
  it('lets the owner add, list, update and delete slot types', async () => {
    const organizer = await createUser('organizer');
    const event = await createEvent(organizer.user._id);
    const created = await request(app)
      .post(`${api}/events/${event.id}/slots`)
      .set(organizer.auth)
      .send({ label: 'Stand A', size: '3 x 3 m', price: 30000, quantity: 10 });
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ label: 'Stand A', available: 10, booked: 0, reserved: 0 });
    const id = created.body.data.id;

    expect((await request(app).get(`${api}/events/${event.id}/slots`)).status).toBe(404);
    const own = await request(app).get(`${api}/events/${event.id}/slots`).set(organizer.auth);
    expect(own.body.data[0]).toMatchObject({ id, booked: 0 });

    const updated = await request(app).patch(`${api}/slots/${id}`).set(organizer.auth).send({ quantity: 12 });
    expect(updated.body.data).toMatchObject({ quantity: 12, available: 12 });

    expect(
      (
        await request(app)
          .patch(`${api}/slots/${id}`)
          .set((await createUser('organizer')).auth)
          .send({ quantity: 1 })
      ).status,
    ).toBe(403);
    expect((await request(app).delete(`${api}/slots/${id}`).set(organizer.auth)).status).toBe(200);
    expect(await SlotModel.countDocuments()).toBe(0);
  });

  it('validates slots and protects booked ones', async () => {
    const { organizer, event, stand } = await fair();
    const bad = await request(app)
      .post(`${api}/events/${event.id}/slots`)
      .set(organizer.auth)
      .send({ label: '', price: 50, quantity: 0 });
    expect(Object.keys(bad.body.error.details).sort()).toEqual(['label', 'price', 'quantity']);
    expect(bad.body.error.details.price.message).toBe('A paid slot must cost at least 100 XAF.');

    await SlotModel.updateOne({ _id: stand._id }, { booked: 2 });
    const price = await request(app).patch(`${api}/slots/${stand.id}`).set(organizer.auth).send({ price: 20000 });
    expect(price.body.error.code).toBe('SLOT_PRICE_LOCKED');
    const quantity = await request(app).patch(`${api}/slots/${stand.id}`).set(organizer.auth).send({ quantity: 1 });
    expect(quantity.body.error).toMatchObject({ code: 'SLOT_QUANTITY_BELOW_BOOKED', details: { minimum: 2 } });
    expect((await request(app).delete(`${api}/slots/${stand.id}`).set(organizer.auth)).body.error.code).toBe(
      'SLOT_IN_USE',
    );

    await EventModel.updateOne({ _id: event._id }, { status: 'cancelled' });
    const closed = await request(app)
      .post(`${api}/events/${event.id}/slots`)
      .set(organizer.auth)
      .send({ label: 'Stand B', price: 0, quantity: 1 });
    expect(closed.body.error.code).toBe('EVENT_NOT_EDITABLE');
  });

  it('shows public slots without the counters', async () => {
    const { event, stand } = await fair('published', { reserved: 1 });
    const res = await request(app).get(`${api}/events/${event.id}/slots`);
    expect(res.body.data).toEqual([
      {
        id: stand.id,
        eventId: event.id,
        label: 'Stand A',
        size: '3 x 3 m',
        price: 30000,
        quantity: 3,
        available: 2,
      },
    ]);
  });
});

describe('POST /orders/slots (EXH-2, EXH-3)', () => {
  it('holds the slots, then confirms the booking and splits the payment', async () => {
    const { organizer, event, stand } = await fair();
    const exhibitor = await createUser('exhibitor', { name: 'Kmer Crafts' });
    const res = await buy(exhibitor.auth, { slotId: stand.id, quantity: 2, phone: '670000000' });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ type: 'slot', status: 'pending', amount: 60000, payeeId: organizer.user.id });
    expect((await SlotModel.findById(stand._id))!.reserved).toBe(2);
    expect(await SlotBookingModel.findOne({ orderId: res.body.data.id })).toMatchObject({ status: 'pending' });

    const tooMany = await buy((await createUser('exhibitor')).auth, {
      slotId: stand.id,
      quantity: 2,
      phone: '670000000',
    });
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error).toMatchObject({ code: 'SLOT_SOLD_OUT', details: { available: 1 } });

    fapshi.setStatus(res.body.data.payment.externalRef, 'SUCCESSFUL');
    await webhook(res.body.data.payment.externalRef, 'SUCCESSFUL');
    await settled(res.body.data.id, 'paid');

    expect(await SlotModel.findById(stand._id)).toMatchObject({ booked: 2, reserved: 0 });
    expect(await SlotBookingModel.findOne({ orderId: res.body.data.id })).toMatchObject({ status: 'paid' });
    expect(await TransactionModel.findOne({ orderId: res.body.data.id })).toMatchObject({
      status: 'successful',
      commission: 6000,
      payeeShare: 54000,
    });
    await vi.waitFor(async () => {
      const notice = await NotificationModel.findOne({ userId: organizer.user._id, type: 'slot_booked' });
      expect(notice!.payload).toMatchObject({ exhibitor: 'Kmer Crafts', slots: ['Stand A'], quantity: 2 });
    });

    const exhibitors = await request(app).get(`${api}/events/${event.id}/exhibitors`);
    expect(exhibitors.body.data).toEqual([{ name: 'Kmer Crafts', slot: 'Stand A', quantity: 2 }]);
    const page = await request(app).get(`${api}/events/${event.id}`);
    expect(page.body.data.exhibitors).toEqual([{ name: 'Kmer Crafts', slot: 'Stand A', quantity: 2 }]);

    const holders = await request(app).get(`${api}/events/${event.id}/slot-bookings`).set(organizer.auth);
    expect(holders.body.data[0]).toMatchObject({
      status: 'paid',
      quantity: 2,
      slot: { label: 'Stand A' },
      exhibitor: { name: 'Kmer Crafts', phone: exhibitor.user.phone },
    });

    const mine = await request(app).get(`${api}/exhibitor/slot-bookings`).set(exhibitor.auth);
    expect(mine.body.data[0]).toMatchObject({ status: 'paid', event: { id: event.id } });
    expect(mine.body.meta.total).toBe(1);

    const budget = await request(app).get(`${api}/events/${event.id}/budget`).set(organizer.auth);
    expect(budget.body.data.totals.income.slots).toBe(54000);
  });

  it('frees the slots when the payment fails or expires', async () => {
    const { stand } = await fair();
    const exhibitor = await createUser('exhibitor');
    const failed = await buy(exhibitor.auth, { slotId: stand.id, quantity: 1, phone: '670000001' });
    fapshi.setStatus(failed.body.data.payment.externalRef, 'FAILED');
    await webhook(failed.body.data.payment.externalRef, 'FAILED');
    await settled(failed.body.data.id, 'failed');
    expect(await SlotBookingModel.findOne({ orderId: failed.body.data.id })).toMatchObject({ status: 'cancelled' });

    const late = await buy(exhibitor.auth, { slotId: stand.id, quantity: 3, phone: '670000000' });
    await expireDueOrders(new Date(Date.now() + 11 * 60 * 1000));
    await settled(late.body.data.id, 'expired');
    expect(await SlotModel.findById(stand._id)).toMatchObject({ reserved: 0, booked: 0 });
    expect(await SlotBookingModel.findOne({ orderId: late.body.data.id })).toMatchObject({ status: 'expired' });

    const mine = await request(app).get(`${api}/exhibitor/slot-bookings`).set(exhibitor.auth);
    expect(mine.body.data).toEqual([]);
  });

  it('refunds a late payment when the slots were taken meanwhile', async () => {
    const { stand } = await fair('published', { quantity: 1 });
    const first = await createUser('exhibitor');
    const slow = await buy(first.auth, { slotId: stand.id, quantity: 1, phone: '670000000' });
    await expireDueOrders(new Date(Date.now() + 11 * 60 * 1000));

    const second = await createUser('exhibitor');
    const quick = await buy(second.auth, { slotId: stand.id, quantity: 1, phone: '690000000' });
    fapshi.setStatus(quick.body.data.payment.externalRef, 'SUCCESSFUL');
    await request(app).post(`${api}/orders/${quick.body.data.id}/verify`).set(second.auth);

    fapshi.setStatus(slow.body.data.payment.externalRef, 'SUCCESSFUL');
    await request(app).post(`${api}/orders/${slow.body.data.id}/verify`).set(first.auth);
    await settled(slow.body.data.id, 'refunded');
    expect(await SlotModel.findById(stand._id)).toMatchObject({ booked: 1, reserved: 0 });
    expect(await NotificationModel.countDocuments({ userId: first.user._id, type: 'slot_refunded' })).toBe(1);
  });

  it('confirms free slots at once and refuses closed events', async () => {
    const { stand, event } = await fair('published', { price: 0 });
    const exhibitor = await createUser('exhibitor');
    const res = await buy(exhibitor.auth, { slotId: stand.id, quantity: 1, phone: '670000000' });
    expect(res.body.data.status).toBe('paid');
    expect(fapshi.callsTo('/direct-pay')).toHaveLength(0);

    await EventModel.collection.updateOne(
      { _id: event._id },
      { $set: { startAt: daysFromNow(-0.1), endAt: daysFromNow(0.1) } },
    );
    expect((await buy(exhibitor.auth, { slotId: stand.id, quantity: 1, phone: '670000000' })).body.error.code).toBe(
      'SLOT_SALES_CLOSED',
    );

    const draft = await fair('draft');
    expect((await buy(exhibitor.auth, { slotId: draft.stand.id, quantity: 1, phone: '670000000' })).status).toBe(400);
    expect(
      (await buy((await createUser('attendee')).auth, { slotId: stand.id, quantity: 1, phone: '670000000' })).status,
    ).toBe(403);
  });

  it('replays the same Idempotency-Key', async () => {
    const { stand } = await fair();
    const exhibitor = await createUser('exhibitor');
    const send = (quantity: number) =>
      request(app)
        .post(`${api}/orders/slots`)
        .set(exhibitor.auth)
        .set('Idempotency-Key', 'slot-buy-0001')
        .send({ slotId: stand.id, quantity, phone: '670000000' });
    const first = await send(1);
    const again = await send(1);
    expect(again.status).toBe(200);
    expect(again.body.data.id).toBe(first.body.data.id);
    expect((await send(2)).body.error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect((await SlotModel.findById(stand._id))!.reserved).toBe(1);
  });
});

describe('GET /exhibitor/events (EXH-2)', () => {
  it('lists upcoming published events that still have slots', async () => {
    const open = await fair();
    await SlotModel.create({ eventId: open.event._id, label: 'Corner', price: 15000, quantity: 2, booked: 1 });
    const full = await fair('published', { booked: 3 });
    await fair('draft');
    const yaounde = await fair('published');
    await EventModel.updateOne({ _id: yaounde.event._id }, { city: 'Yaoundé' });
    const exhibitor = await createUser('exhibitor');

    const res = await request(app).get(`${api}/exhibitor/events`).set(exhibitor.auth);
    expect(res.body.data.map((event: { id: string }) => event.id).sort()).toEqual(
      [open.event.id, yaounde.event.id].sort(),
    );
    const item = res.body.data.find((event: { id: string }) => event.id === open.event.id);
    expect(item).toMatchObject({ slotsAvailable: 4, slotPriceFrom: 15000 });
    expect(full.event.id).toBeDefined();

    const city = await request(app).get(`${api}/exhibitor/events?city=yaoundé`).set(exhibitor.auth);
    expect(city.body.data.map((event: { id: string }) => event.id)).toEqual([yaounde.event.id]);
    expect((await request(app).get(`${api}/exhibitor/events`).set(open.organizer.auth)).status).toBe(403);
  });
});

describe('event slot bookings (EXH-4)', () => {
  it('is for the owner and admins; exhibitors list is public for published events', async () => {
    const { event } = await fair('draft');
    expect((await request(app).get(`${api}/events/${event.id}/exhibitors`)).status).toBe(404);
    expect(
      (
        await request(app)
          .get(`${api}/events/${event.id}/slot-bookings`)
          .set((await createUser('organizer')).auth)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get(`${api}/events/${event.id}/slot-bookings`)
          .set((await createUser('admin')).auth)
      ).status,
    ).toBe(200);
  });
});
