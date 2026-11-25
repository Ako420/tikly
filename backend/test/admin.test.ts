import { Types } from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import {
  EventModel,
  NotificationModel,
  OrderModel,
  ProviderModel,
  ReviewModel,
  ServiceModel,
  SettingModel,
  TicketModel,
  TransactionModel,
  UserModel,
} from '../src/model';
import { getCommissionRate } from '../src/service/setting.service';
import { settleNotifications } from '../src/service/notification.service';
import { createQrToken } from '../src/util/qrToken';
import { useTestDatabase } from './helpers/db';
import { createEvent, createUser, objectId } from './helpers/factories';

useTestDatabase('admin-panel');

const app = buildApp();
const api = '/api/v1';
let counter = 0;

const as = async () => (await createUser('admin')).auth;
const call = (method: 'get' | 'post' | 'patch', path: string, auth: Record<string, string>, body?: object) =>
  request(app)[method](`${api}/admin${path}`).set(auth).send(body);

async function business(verification = 'pending') {
  const owner = await createUser('provider', { name: 'Paul Biya Hire' });
  const provider = await ProviderModel.create({
    userId: owner.user._id,
    businessName: 'Akwa Events Hire',
    city: 'Douala',
    country: 'Cameroon',
    phone: '+237677123456',
    documents: ['documents/niu_scan', 'documents/licence'],
    verification,
    ...(verification === 'rejected' && { rejectionReason: 'Blurry.' }),
  });
  return { owner, provider };
}

describe('admin access', () => {
  it('is for admins only', async () => {
    const organizer = await createUser('organizer');
    expect((await call('get', '/events', organizer.auth)).status).toBe(403);
    expect((await request(app).get(`${api}/admin/stats`)).status).toBe(401);
  });
});

describe('event moderation (EVT-3, ADM-1, ADM-2)', () => {
  it('lists the pending queue oldest first with the organizer', async () => {
    const organizer = await createUser('organizer', { name: 'Ama Ngono' });
    const first = await createEvent(organizer.user._id, { status: 'pending' });
    const second = await createEvent(organizer.user._id, { status: 'pending' });
    await createEvent(organizer.user._id, { status: 'draft' });
    const res = await call('get', '/events', await as());
    expect(res.body.data.map((event: { id: string }) => event.id)).toEqual([first.id, second.id]);
    expect(res.body.data[0].organizer).toMatchObject({ name: 'Ama Ngono', email: organizer.user.email });
    expect((await call('get', '/events?status=draft', await as())).body.meta.total).toBe(1);
  });

  it('approves and rejects pending events and tells the organizer', async () => {
    const admin = await as();
    const organizer = await createUser('organizer');
    const good = await createEvent(organizer.user._id, { status: 'pending' });
    const bad = await createEvent(organizer.user._id, { status: 'pending' });

    const approved = await call('post', `/events/${good.id}/approve`, admin);
    expect(approved.body.data.status).toBe('published');
    expect((await request(app).get(`${api}/events/${good.id}`)).status).toBe(200);
    expect((await call('post', `/events/${good.id}/approve`, admin)).body.error.code).toBe('EVENT_NOT_PENDING');

    expect((await call('post', `/events/${bad.id}/reject`, admin, {})).status).toBe(400);
    const rejected = await call('post', `/events/${bad.id}/reject`, admin, { reason: 'Add the venue address.' });
    expect(rejected.body.data).toMatchObject({ status: 'rejected', rejectionReason: 'Add the venue address.' });

    await settleNotifications();
    const types = await NotificationModel.find({ userId: organizer.user._id }).distinct('type');
    expect(types.sort()).toEqual(['event_approved', 'event_rejected']);
    expect((await call('post', `/events/${objectId()}/approve`, admin)).status).toBe(404);
  });

  it('suspends and restores a published event', async () => {
    const admin = await as();
    const organizer = await createUser('organizer');
    const event = await createEvent(organizer.user._id, { status: 'published' });

    const suspended = await call('patch', `/events/${event.id}/status`, admin, { status: 'suspended' });
    expect(suspended.body.data.status).toBe('suspended');
    expect((await request(app).get(`${api}/events/${event.id}`)).status).toBe(404);
    expect(await NotificationModel.countDocuments({ userId: organizer.user._id, type: 'event_suspended' })).toBe(1);

    expect((await call('patch', `/events/${event.id}/status`, admin, { status: 'suspended' })).body.error.code).toBe(
      'EVENT_STATUS_LOCKED',
    );
    expect((await call('patch', `/events/${event.id}/status`, admin, { status: 'published' })).body.data.status).toBe(
      'published',
    );
    const draft = await createEvent(organizer.user._id);
    expect((await call('patch', `/events/${draft.id}/status`, admin, { status: 'published' })).status).toBe(409);
  });
});

describe('provider verification (SRV-2, ADM-1)', () => {
  it('shows pending businesses and their documents with short-lived links', async () => {
    const admin = await as();
    const { provider } = await business();
    await business('verified');

    const list = await call('get', '/providers', admin);
    expect(list.body.data.map((item: { id: string }) => item.id)).toEqual([provider.id]);
    expect(list.body.data[0].user).toMatchObject({ name: 'Paul Biya Hire' });

    const detail = await call('get', `/providers/${provider.id}`, admin);
    expect(detail.body.data.documents).toHaveLength(2);
    expect(detail.body.data.documents[0]).toMatchObject({ publicId: 'documents/niu_scan' });
    expect(detail.body.data.documents[0].url).toMatch(/^https:\/\//);
    expect(new Date(detail.body.data.documents[0].expiresAt).getTime() - Date.now()).toBeLessThanOrEqual(600_000);
  });

  it('verifies, then rejects with a reason, notifying the provider', async () => {
    const admin = await as();
    const { owner, provider } = await business();
    await ServiceModel.create({
      providerId: provider._id,
      category: 'chairs',
      title: { en: 'Chairs' },
      city: 'Douala',
      price: 300,
      unit: 'per_item',
    });

    const verified = await call('post', `/providers/${provider.id}/verify`, admin);
    expect(verified.body.data.verification).toBe('verified');
    expect((await request(app).get(`${api}/services`)).body.meta.total).toBe(1);
    expect((await call('post', `/providers/${provider.id}/verify`, admin)).body.error.code).toBe(
      'PROVIDER_ALREADY_VERIFIED',
    );

    const rejected = await call('post', `/providers/${provider.id}/reject`, admin, { reason: 'Expired licence.' });
    expect(rejected.body.data).toMatchObject({ verification: 'rejected', rejectionReason: 'Expired licence.' });
    expect((await request(app).get(`${api}/services`)).body.meta.total).toBe(0);
    expect((await call('post', `/providers/${provider.id}/reject`, admin, { reason: 'Again' })).body.error.code).toBe(
      'PROVIDER_ALREADY_REJECTED',
    );

    const again = await call('post', `/providers/${provider.id}/verify`, admin);
    expect(again.body.data.rejectionReason).toBeUndefined();
    const types = await NotificationModel.find({ userId: owner.user._id }).distinct('type');
    expect(types.sort()).toEqual(['provider_rejected', 'provider_verified']);
  });
});

describe('users, services and reviews (ADM-2, REV-4)', () => {
  it('finds users and suspends them, signing them out', async () => {
    const admin = await createUser('admin');
    const ama = await createUser('organizer', { name: 'Ama Ngono' });
    await UserModel.updateOne({ _id: ama.user._id }, { refreshTokenHash: 'hash' });
    await createUser('attendee', { name: 'Bello' });

    const found = await call('get', '/users?q=ngono', admin.auth);
    expect(found.body.data.map((user: { id: string }) => user.id)).toEqual([ama.user.id]);
    expect(found.body.data[0].passwordHash).toBeUndefined();
    expect((await call('get', '/users?role=attendee', admin.auth)).body.meta.total).toBe(1);

    const res = await call('patch', `/users/${ama.user.id}/status`, admin.auth, { status: 'suspended' });
    expect(res.body.data.status).toBe('suspended');
    expect((await UserModel.findById(ama.user._id).select('+refreshTokenHash'))!.refreshTokenHash).toBeUndefined();
    expect((await request(app).get(`${api}/auth/me`).set(ama.auth)).body.error.code).toBe('ACCOUNT_SUSPENDED');
    expect((await call('get', '/users?status=suspended', admin.auth)).body.meta.total).toBe(1);

    await call('patch', `/users/${ama.user.id}/status`, admin.auth, { status: 'active' });
    expect((await request(app).get(`${api}/auth/me`).set(ama.auth)).status).toBe(200);
    expect(
      (await call('patch', `/users/${admin.user.id}/status`, admin.auth, { status: 'suspended' })).body.error.code,
    ).toBe('CANNOT_CHANGE_OWN_STATUS');
  });

  it('hides a service listing', async () => {
    const { provider } = await business('verified');
    const service = await ServiceModel.create({
      providerId: provider._id,
      category: 'sound',
      title: { en: 'Sound' },
      city: 'Douala',
      price: 1000,
      unit: 'per_event',
    });
    const res = await call('patch', `/services/${service.id}/status`, await as(), { active: false });
    expect(res.body.data).toMatchObject({ id: service.id, active: false });
    expect((await request(app).get(`${api}/services/${service.id}`)).status).toBe(404);
  });

  it('hides a review and recounts the rating', async () => {
    const organizer = await createUser('organizer');
    const event = await createEvent(organizer.user._id, { status: 'completed' });
    const [rude, kind] = await ReviewModel.create([
      { target: 'event', targetId: event._id, authorId: objectId(), rating: 1, comment: 'abuse' },
      { target: 'event', targetId: event._id, authorId: objectId(), rating: 5 },
    ]);
    await EventModel.updateOne({ _id: event._id }, { ratingAvg: 3, ratingCount: 2 });

    const res = await call('patch', `/reviews/${rude!.id}/hide`, await as(), { hidden: true });
    expect(res.body.data).toMatchObject({ hidden: true, targetRating: { ratingAvg: 5, ratingCount: 1 } });
    const list = await request(app).get(`${api}/events/${event.id}/reviews`);
    expect(list.body.data.map((item: { id: string }) => item.id)).toEqual([kind!.id]);
  });
});

describe('GET /admin/stats (ADM-3)', () => {
  it('totals users, events, tickets and money per stream', async () => {
    const admin = await createUser('admin');
    const organizer = await createUser('organizer');
    await createUser('attendee');
    const event = await createEvent(organizer.user._id, { status: 'published' });
    await createEvent(organizer.user._id, { status: 'pending' });

    const pay = async (type: 'ticket' | 'service' | 'slot', amount: number, at: Date, kind = 'payment') => {
      counter += 1;
      const order = await OrderModel.create({
        type,
        buyerId: objectId(),
        payeeId: organizer.user._id,
        eventId: event._id,
        items: [{ refId: objectId(), refModel: 'TicketTier', quantity: 1, unitPrice: amount }],
        amount,
        phone: '+237677999999',
        status: 'paid',
      });
      const tx = await TransactionModel.create({
        orderId: order._id,
        provider: 'fapshi',
        externalRef: `stat-${counter}`,
        kind,
        amount,
        commission: kind === 'payment' ? amount / 10 : 0,
        payeeShare: kind === 'payment' ? amount - amount / 10 : 0,
        status: 'successful',
      });
      await TransactionModel.collection.updateOne({ _id: tx._id }, { $set: { createdAt: at } });
    };
    await pay('ticket', 10000, new Date('2026-11-05'));
    await pay('ticket', 5000, new Date('2026-10-05'));
    await pay('ticket', 2000, new Date('2026-11-06'), 'refund');
    await pay('service', 50000, new Date('2026-11-07'));
    await pay('slot', 30000, new Date('2026-11-08'));

    for (const status of ['valid', 'checked_in', 'refunded']) {
      const _id = new Types.ObjectId();
      await TicketModel.create({
        _id,
        code: `EVT-STAT-${status.length}${counter++}`,
        qrToken: createQrToken(String(_id)),
        orderId: objectId(),
        eventId: event._id,
        tierId: objectId(),
        holderId: objectId(),
        status,
      });
    }

    const all = await call('get', '/stats', admin.auth);
    expect(all.body.data.users).toMatchObject({ admin: 1, organizer: 1, attendee: 1, provider: 0, total: 3 });
    expect(all.body.data.events).toMatchObject({ published: 1, pending: 1, total: 2 });
    expect(all.body.data.ticketsSold).toBe(2);
    expect(all.body.data.revenue.ticket).toEqual({
      payments: 2,
      gross: 15000,
      commission: 1500,
      payees: 13500,
      refunded: 2000,
    });
    expect(all.body.data.revenue.total).toEqual({ gross: 95000, commission: 9500, refunded: 2000 });

    const november = await call('get', '/stats?from=2026-11-01&to=2026-11-30', admin.auth);
    expect(november.body.data.revenue.ticket).toMatchObject({ payments: 1, gross: 10000 });
    expect(november.body.data.revenue.service.commission).toBe(5000);
    expect(november.body.data.revenue.slot.gross).toBe(30000);
  });
});

describe('settings (PAY-2, ADM-4)', () => {
  it('shows defaults and saves commission rates and categories', async () => {
    const admin = await as();
    const defaults = await call('get', '/settings', admin);
    expect(defaults.body.data.commission).toEqual({ ticket: 10, service: 10, slot: 10 });
    expect(defaults.body.data.categories.length).toBeGreaterThan(0);

    const res = await call('patch', '/settings', admin, {
      commission: { slot: 12.5 },
      categories: [
        { key: 'Concert', en: 'Concert', fr: 'Concert' },
        { key: 'wedding-expo', en: 'Wedding expo', fr: 'Salon du mariage' },
      ],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.commission).toEqual({ ticket: 10, service: 10, slot: 12.5 });
    expect(res.body.data.categories.map((category: { key: string }) => category.key)).toEqual([
      'concert',
      'wedding-expo',
    ]);
    expect(await getCommissionRate('slot')).toBe(12.5);
    expect((await request(app).get(`${api}/categories`)).body.data).toHaveLength(2);

    await call('patch', '/settings', admin, { commission: { ticket: 8 } });
    expect((await SettingModel.findOne())!.commission).toMatchObject({ ticket: 8, slot: 12.5 });
    expect(await SettingModel.countDocuments()).toBe(1);
  });

  it('validates rates and categories', async () => {
    const admin = await as();
    const res = await call('patch', '/settings', admin, {
      commission: { ticket: 31 },
      categories: [
        { key: 'a b', en: 'A', fr: 'A' },
        { key: 'x', en: '', fr: 'X' },
      ],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details['commission.ticket'].message).toBe('Commission must be between 0% and 30%.');
    expect(res.body.error.details['categories.0.key'].message).toBe(
      'Category keys may only use lowercase letters, numbers and dashes.',
    );
    expect(res.body.error.details['categories.1.en'].message).toBe('Each category needs an English name.');

    const duplicate = await call('patch', '/settings', admin, {
      categories: [
        { key: 'expo', en: 'Expo', fr: 'Expo' },
        { key: 'expo', en: 'Expo 2', fr: 'Expo 2' },
      ],
    });
    expect(duplicate.body.error.details.categories.message).toBe('Two categories cannot share the same key.');
    expect((await call('patch', '/settings', admin, {})).status).toBe(400);
  });
});
