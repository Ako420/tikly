import type { RequestHandler } from 'express';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/rateLimit', () => {
  const pass: RequestHandler = (_req, _res, next) => next();
  return { authLimiter: pass, paymentLimiter: pass };
});

import { buildApp } from '../src/app';
import { setPaymentProvider } from '../src/lib/payment/provider';
import {
  BookingModel,
  BudgetItemModel,
  NotificationModel,
  OrderModel,
  ProviderModel,
  ServiceModel,
  TransactionModel,
} from '../src/model';
import { expireDueOrders } from '../src/service/order.service';
import { useTestDatabase } from './helpers/db';
import { WEBHOOK_SECRET, fakeFapshi } from './helpers/fapshi';
import { createEvent, createUser, daysFromNow } from './helpers/factories';

useTestDatabase('bookings');

const app = buildApp();
const api = '/api/v1';
let fapshi = fakeFapshi();

beforeEach(() => {
  fapshi = fakeFapshi();
  setPaymentProvider(fapshi.provider);
});

afterAll(() => setPaymentProvider(undefined));

async function marketplace() {
  const providerAccount = await createUser('provider');
  const profile = await ProviderModel.create({
    userId: providerAccount.user._id,
    businessName: 'Akwa Events Hire',
    city: 'Douala',
    country: 'Cameroon',
    phone: '+237677123456',
    whatsapp: '+237690123456',
    documents: ['documents/niu'],
    verification: 'verified',
  });
  const service = await ServiceModel.create({
    providerId: profile._id,
    category: 'canopy',
    title: { en: 'Canopy 5x10 m', fr: 'Bâche 5x10 m' },
    city: 'Douala',
    price: 25000,
    unit: 'per_day',
  });
  const organizer = await createUser('organizer', { name: 'Ama Ngono' });
  const event = await createEvent(organizer.user._id, { status: 'published' });
  return { provider: providerAccount, profile, service, organizer, event };
}

const requestBody = (serviceId: string, overrides: Record<string, unknown> = {}) => ({
  serviceId,
  startDate: daysFromNow(10).toISOString(),
  endDate: daysFromNow(11).toISOString(),
  quantity: 2,
  note: 'Near the main stage, please.',
  ...overrides,
});

const post = (path: string, auth: Record<string, string>, body: Record<string, unknown> = {}) =>
  request(app).post(`${api}${path}`).set(auth).send(body);

const webhook = (transId: string, status: string) =>
  request(app).post(`${api}/payments/webhook/fapshi`).set('x-wh-secret', WEBHOOK_SECRET).send({ transId, status });

async function acceptedBooking(withEvent = true) {
  const world = await marketplace();
  const created = await post(
    '/bookings',
    world.organizer.auth,
    requestBody(world.service.id, withEvent ? { eventId: world.event.id } : {}),
  );
  const bookingId = created.body.data.id as string;
  await post(`/bookings/${bookingId}/accept`, world.provider.auth, { amount: 50000 });
  return { ...world, bookingId };
}

const pay = (auth: Record<string, string>, bookingId: string, phone = '670000000') =>
  post('/orders/bookings', auth, { bookingId, phone });

async function settled(orderId: string, status: string) {
  await vi.waitFor(async () => expect((await OrderModel.findById(orderId))!.status).toBe(status), { timeout: 3000 });
}

describe('requesting a booking (SRV-6)', () => {
  it('creates a request and notifies the provider', async () => {
    const { provider, service, organizer, event } = await marketplace();
    const res = await post('/bookings', organizer.auth, requestBody(service.id, { eventId: event.id }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      status: 'requested',
      quantity: 2,
      amount: null,
      note: 'Near the main stage, please.',
      service: { id: service.id, category: 'canopy', price: 25000, unit: 'per_day' },
      provider: { businessName: 'Akwa Events Hire', phone: '+237677123456' },
      organizer: { name: 'Ama Ngono' },
      event: { id: event.id },
      payment: null,
    });
    const notice = await NotificationModel.findOne({ userId: provider.user._id, type: 'booking_requested' });
    expect(notice!.payload).toMatchObject({ bookingId: res.body.data.id, service: 'Canopy 5x10 m', quantity: 2 });
  });

  it('refuses unlisted services, other organizers’ events and bad dates', async () => {
    const { service, organizer } = await marketplace();
    const rivalEvent = await createEvent((await createUser('organizer')).user._id);
    expect((await post('/bookings', organizer.auth, requestBody(service.id, { eventId: rivalEvent.id }))).status).toBe(
      403,
    );

    const dates = await post(
      '/bookings',
      organizer.auth,
      requestBody(service.id, { startDate: daysFromNow(-1).toISOString(), endDate: daysFromNow(-2).toISOString() }),
    );
    expect(dates.status).toBe(400);
    expect(dates.body.error.details.startDate.message).toBe('The booking must start in the future.');

    await ServiceModel.updateOne({ _id: service._id }, { active: false });
    expect((await post('/bookings', organizer.auth, requestBody(service.id))).status).toBe(404);

    const provider = await createUser('provider');
    expect((await post('/bookings', provider.auth, requestBody(service.id))).status).toBe(403);
  });
});

describe('answering and listing bookings', () => {
  it('lets the provider accept once with a final price', async () => {
    const { provider, service, organizer } = await marketplace();
    const { body } = await post('/bookings', organizer.auth, requestBody(service.id));
    const id = body.data.id;

    const low = await post(`/bookings/${id}/accept`, provider.auth, { amount: 50 });
    expect(low.body.error.details.amount.message).toBe('The price must be at least 100 XAF, the mobile money minimum.');

    const res = await post(`/bookings/${id}/accept`, provider.auth, { amount: 50000 });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'accepted', amount: 50000 });
    expect(await NotificationModel.countDocuments({ userId: organizer.user._id, type: 'booking_accepted' })).toBe(1);

    const again = await post(`/bookings/${id}/decline`, provider.auth);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('BOOKING_NOT_PENDING');
  });

  it('lets the provider decline with a reason', async () => {
    const { provider, service, organizer } = await marketplace();
    const { body } = await post('/bookings', organizer.auth, requestBody(service.id));
    const res = await post(`/bookings/${body.data.id}/decline`, provider.auth, { reason: 'Fully booked.' });
    expect(res.body.data).toMatchObject({ status: 'declined', declineReason: 'Fully booked.' });
    expect(await NotificationModel.countDocuments({ type: 'booking_declined' })).toBe(1);
  });

  it('shows each party only their bookings', async () => {
    const { provider, service, organizer } = await marketplace();
    const { body } = await post('/bookings', organizer.auth, requestBody(service.id));
    const id = body.data.id;
    const other = await marketplace();
    await post('/bookings', other.organizer.auth, requestBody(other.service.id));

    const mine = await request(app).get(`${api}/bookings`).set(organizer.auth);
    expect(mine.body.data.map((item: { id: string }) => item.id)).toEqual([id]);
    const incoming = await request(app).get(`${api}/bookings?status=requested`).set(provider.auth);
    expect(incoming.body.data.map((item: { id: string }) => item.id)).toEqual([id]);
    expect((await request(app).get(`${api}/bookings?status=paid`).set(provider.auth)).body.meta.total).toBe(0);

    expect((await request(app).get(`${api}/bookings/${id}`).set(provider.auth)).status).toBe(200);
    expect((await request(app).get(`${api}/bookings/${id}`).set(other.organizer.auth)).status).toBe(404);
    expect((await post(`/bookings/${id}/accept`, other.provider.auth, { amount: 1000 })).status).toBe(404);
    expect(
      (
        await request(app)
          .get(`${api}/bookings/${id}`)
          .set((await createUser('admin')).auth)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get(`${api}/bookings`)
          .set((await createUser('attendee')).auth)
      ).status,
    ).toBe(403);
  });

  it('lets the organizer cancel before payment only', async () => {
    const { provider, organizer, bookingId } = await acceptedBooking();
    const res = await post(`/bookings/${bookingId}/cancel`, organizer.auth);
    expect(res.body.data.status).toBe('cancelled');
    expect(await NotificationModel.countDocuments({ userId: provider.user._id, type: 'booking_cancelled' })).toBe(1);
    expect((await post(`/bookings/${bookingId}/cancel`, organizer.auth)).body.error.code).toBe(
      'BOOKING_NOT_CANCELLABLE',
    );
  });
});

describe('POST /orders/bookings', () => {
  it('charges the accepted price, then marks the booking paid and budgets it (PLN-6)', async () => {
    const { provider, organizer, event, bookingId } = await acceptedBooking();
    const res = await pay(organizer.auth, bookingId);
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      type: 'service',
      status: 'pending',
      amount: 50000,
      payeeId: provider.user.id,
    });
    expect(fapshi.callsTo('/direct-pay')[0]!.body).toMatchObject({ amount: 50000, phone: '670000000' });

    const waiting = await pay(organizer.auth, bookingId);
    expect(waiting.status).toBe(409);
    expect(waiting.body.error).toMatchObject({
      code: 'BOOKING_PAYMENT_PENDING',
      details: { orderId: res.body.data.id },
    });
    expect((await post(`/bookings/${bookingId}/cancel`, organizer.auth)).body.error.code).toBe(
      'BOOKING_PAYMENT_PENDING',
    );

    fapshi.setStatus(res.body.data.payment.externalRef, 'SUCCESSFUL');
    await webhook(res.body.data.payment.externalRef, 'SUCCESSFUL');
    await settled(res.body.data.id, 'paid');

    const booking = await request(app).get(`${api}/bookings/${bookingId}`).set(organizer.auth);
    expect(booking.body.data).toMatchObject({ status: 'paid', payment: { orderId: res.body.data.id, status: 'paid' } });
    const tx = await TransactionModel.findOne({ orderId: res.body.data.id });
    expect(tx).toMatchObject({ status: 'successful', commission: 5000, payeeShare: 45000 });
    const lines = await BudgetItemModel.find({ eventId: event._id });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ label: 'Canopy 5x10 m', category: 'canopy', planned: 50000, actual: 50000 });
    await vi.waitFor(async () =>
      expect(await NotificationModel.countDocuments({ userId: provider.user._id, type: 'booking_paid' })).toBe(1),
    );

    const earnings = await request(app).get(`${api}/providers/me/earnings`).set(provider.auth);
    expect(earnings.body.data).toMatchObject({ paidBookings: 1, gross: 50000, net: 45000 });
    expect((await pay(organizer.auth, bookingId)).body.error.code).toBe('BOOKING_NOT_PAYABLE');
  });

  it('fills a budget line the organizer already linked instead of adding one', async () => {
    const { organizer, event, bookingId } = await acceptedBooking();
    await post(`/events/${event.id}/budget`, organizer.auth, {
      label: 'Canopy',
      category: 'decor',
      planned: 60000,
      bookingId,
    });
    const res = await pay(organizer.auth, bookingId);
    fapshi.setStatus(res.body.data.payment.externalRef, 'SUCCESSFUL');
    await post(`/orders/${res.body.data.id}/verify`, organizer.auth);

    const lines = await BudgetItemModel.find({ eventId: event._id });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ label: 'Canopy', planned: 60000, actual: 50000 });
  });

  it('skips the budget for bookings without an event', async () => {
    const { organizer, bookingId } = await acceptedBooking(false);
    const res = await pay(organizer.auth, bookingId);
    fapshi.setStatus(res.body.data.payment.externalRef, 'SUCCESSFUL');
    await post(`/orders/${res.body.data.id}/verify`, organizer.auth);
    expect((await BookingModel.findById(bookingId))!.status).toBe('paid');
    expect(await BudgetItemModel.countDocuments()).toBe(0);
  });

  it('allows paying again after a failed payment', async () => {
    const { organizer, bookingId } = await acceptedBooking();
    const first = await pay(organizer.auth, bookingId, '670000001');
    fapshi.setStatus(first.body.data.payment.externalRef, 'FAILED');
    await post(`/orders/${first.body.data.id}/verify`, organizer.auth);
    expect((await OrderModel.findById(first.body.data.id))!.status).toBe('failed');

    const second = await pay(organizer.auth, bookingId);
    expect(second.status).toBe(201);
    expect((await BookingModel.findById(bookingId))!.orderId!.toString()).toBe(second.body.data.id);
  });

  it('only lets the organizer pay an accepted booking', async () => {
    const { provider, service, organizer } = await marketplace();
    const { body } = await post('/bookings', organizer.auth, requestBody(service.id));
    expect((await pay(organizer.auth, body.data.id)).body.error.code).toBe('BOOKING_NOT_PAYABLE');
    await post(`/bookings/${body.data.id}/accept`, provider.auth, { amount: 50000 });
    expect((await pay((await createUser('organizer')).auth, body.data.id)).status).toBe(404);
  });

  it('replays the same Idempotency-Key instead of charging twice', async () => {
    const { organizer, bookingId } = await acceptedBooking();
    const send = () =>
      request(app)
        .post(`${api}/orders/bookings`)
        .set(organizer.auth)
        .set('Idempotency-Key', 'booking-pay-0001')
        .send({ bookingId, phone: '670000000' });
    const first = await send();
    const again = await send();
    expect(again.status).toBe(200);
    expect(again.body.data.id).toBe(first.body.data.id);
    expect(fapshi.callsTo('/direct-pay')).toHaveLength(1);
  });

  it('refunds a late payment for a booking cancelled meanwhile', async () => {
    const { organizer, bookingId } = await acceptedBooking();
    const res = await pay(organizer.auth, bookingId);
    await expireDueOrders(new Date(Date.now() + 11 * 60 * 1000));
    await settled(res.body.data.id, 'expired');
    expect((await post(`/bookings/${bookingId}/cancel`, organizer.auth)).body.data.status).toBe('cancelled');

    fapshi.setStatus(res.body.data.payment.externalRef, 'SUCCESSFUL');
    await post(`/orders/${res.body.data.id}/verify`, organizer.auth);

    await settled(res.body.data.id, 'refunded');
    expect((await BookingModel.findById(bookingId))!.status).toBe('cancelled');
    expect(fapshi.callsTo('/payout')[0]!.body).toMatchObject({ amount: 50000 });
    expect(await NotificationModel.countDocuments({ userId: organizer.user._id, type: 'booking_cancelled' })).toBe(1);
  });

  it('accepts a late payment while the booking is still waiting for it', async () => {
    const { organizer, bookingId } = await acceptedBooking();
    const res = await pay(organizer.auth, bookingId);
    await expireDueOrders(new Date(Date.now() + 11 * 60 * 1000));
    fapshi.setStatus(res.body.data.payment.externalRef, 'SUCCESSFUL');
    await post(`/orders/${res.body.data.id}/verify`, organizer.auth);
    await settled(res.body.data.id, 'paid');
    expect((await BookingModel.findById(bookingId))!.status).toBe('paid');
  });
});

describe('POST /bookings/:id/complete', () => {
  it('closes a paid booking after its end date', async () => {
    const { provider, organizer, bookingId } = await acceptedBooking();
    const res = await pay(organizer.auth, bookingId);
    fapshi.setStatus(res.body.data.payment.externalRef, 'SUCCESSFUL');
    await post(`/orders/${res.body.data.id}/verify`, organizer.auth);

    const early = await post(`/bookings/${bookingId}/complete`, provider.auth);
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe('BOOKING_NOT_COMPLETABLE');

    await BookingModel.collection.updateOne(
      { _id: (await BookingModel.findById(bookingId))!._id },
      { $set: { startDate: daysFromNow(-3), endDate: daysFromNow(-2) } },
    );
    const done = await post(`/bookings/${bookingId}/complete`, provider.auth);
    expect(done.body.data.status).toBe('completed');
    expect((await post(`/bookings/${bookingId}/complete`, organizer.auth)).status).toBe(403);
  });
});
