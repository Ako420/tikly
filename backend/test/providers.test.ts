import type { Types } from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { NotificationModel, OrderModel, ProviderModel, ServiceModel, TransactionModel } from '../src/model';
import { useTestDatabase } from './helpers/db';
import { createUser, objectId } from './helpers/factories';

useTestDatabase('providers');

const app = buildApp();
const api = '/api/v1';
let counter = 0;

const profileInput = (overrides: Record<string, unknown> = {}) => ({
  businessName: 'Akwa Events Hire',
  description: 'Chairs, canopies and sound.',
  city: 'Douala',
  country: 'Cameroon',
  phone: '677 12 34 56',
  whatsapp: '690123456',
  documents: ['documents/niu_scan_x81kq'],
  ...overrides,
});

const serviceInput = (overrides: Record<string, unknown> = {}) => ({
  category: 'canopy',
  title: { en: 'Canopy 5x10 m with setup', fr: 'Bâche 5x10 m avec montage' },
  description: 'White canopy, set up the day before.',
  photos: ['https://res.cloudinary.com/demo/image/upload/services/c1.jpg'],
  city: 'Douala',
  price: 25000,
  unit: 'per_day',
  ...overrides,
});

async function provider(verification: 'pending' | 'verified' | 'rejected' = 'verified', city = 'Douala') {
  const account = await createUser('provider');
  counter += 1;
  const profile = await ProviderModel.create({
    ...profileInput({ phone: '+237677123456', whatsapp: '+237690123456', city }),
    businessName: `Business ${counter}`,
    userId: account.user._id,
    verification,
    ...(verification === 'rejected' && { rejectionReason: 'The ID scan is blurry.' }),
  });
  return { ...account, profile };
}

function service(providerId: Types.ObjectId, overrides: Record<string, unknown> = {}) {
  return ServiceModel.create({ ...serviceInput(), providerId, ...overrides });
}

describe('provider profile (SRV-1)', () => {
  it('creates a pending profile once and tells the admins', async () => {
    const account = await createUser('provider');
    const admin = await createUser('admin');

    expect((await request(app).get(`${api}/providers/me`).set(account.auth)).status).toBe(404);
    const res = await request(app).post(`${api}/providers/me`).set(account.auth).send(profileInput());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      businessName: 'Akwa Events Hire',
      phone: '+237677123456',
      whatsapp: '+237690123456',
      verification: 'pending',
      userId: account.user.id,
    });
    expect(await NotificationModel.countDocuments({ userId: admin.user._id, type: 'provider_pending' })).toBe(1);

    const again = await request(app).post(`${api}/providers/me`).set(account.auth).send(profileInput());
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('PROVIDER_EXISTS');

    const mine = await request(app).get(`${api}/providers/me`).set(account.auth);
    expect(mine.body.data.verification).toBe('pending');
  });

  it('only accepts uploaded document ids and provider accounts', async () => {
    const account = await createUser('provider');
    const bad = await request(app)
      .post(`${api}/providers/me`)
      .set(account.auth)
      .send(profileInput({ documents: ['events/cover'] }));
    expect(bad.status).toBe(400);
    expect(bad.body.error.details['documents.0'].message).toBe(
      'Each document must be one you uploaded with POST /uploads/document.',
    );
    const none = await request(app)
      .post(`${api}/providers/me`)
      .set(account.auth)
      .send(profileInput({ documents: [] }));
    expect(none.body.error.details.documents.message).toBe('Upload at least one verification document.');

    const organizer = await createUser('organizer');
    expect((await request(app).post(`${api}/providers/me`).set(organizer.auth).send(profileInput())).status).toBe(403);
  });

  it('sends the profile back for review when documents change', async () => {
    const { auth, profile } = await provider('verified');
    await createUser('admin');

    const contact = await request(app).patch(`${api}/providers/me`).set(auth).send({ whatsapp: '699000111' });
    expect(contact.body.data).toMatchObject({ whatsapp: '+237699000111', verification: 'verified' });

    const same = await request(app).patch(`${api}/providers/me`).set(auth).send({ documents: profile.documents });
    expect(same.body.data.verification).toBe('verified');

    const res = await request(app)
      .patch(`${api}/providers/me`)
      .set(auth)
      .send({ documents: ['documents/new_licence'] });
    expect(res.body.data).toMatchObject({ verification: 'pending', documents: ['documents/new_licence'] });
    expect(await NotificationModel.countDocuments({ type: 'provider_pending' })).toBe(1);
  });

  it('resubmits a rejected profile on any change', async () => {
    const { auth } = await provider('rejected');
    const before = await request(app).get(`${api}/providers/me`).set(auth);
    expect(before.body.data.rejectionReason).toBe('The ID scan is blurry.');

    const res = await request(app).patch(`${api}/providers/me`).set(auth).send({ businessName: 'Akwa Hire SARL' });
    expect(res.body.data.verification).toBe('pending');
    expect(res.body.data.rejectionReason).toBeUndefined();
  });
});

describe('GET /providers/:id (SRV-5)', () => {
  it('shows verified providers with contacts and active services only', async () => {
    const { profile } = await provider('verified');
    const live = await service(profile._id);
    await service(profile._id, { active: false });

    const res = await request(app).get(`${api}/providers/${profile.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: profile.id, phone: '+237677123456', whatsapp: '+237690123456' });
    expect(res.body.data.services.map((item: { id: string }) => item.id)).toEqual([live.id]);
    expect(res.body.data.documents).toBeUndefined();
    expect(res.body.data.userId).toBeUndefined();

    const pending = await provider('pending');
    expect((await request(app).get(`${api}/providers/${pending.profile.id}`)).status).toBe(404);
  });
});

describe('creating and managing services (SRV-3)', () => {
  it('needs a verified business', async () => {
    const noProfile = await createUser('provider');
    const pending = await provider('pending');
    for (const auth of [noProfile.auth, pending.auth]) {
      const res = await request(app).post(`${api}/services`).set(auth).send(serviceInput());
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PROVIDER_NOT_VERIFIED');
    }

    const { auth, profile } = await provider('verified');
    const res = await request(app).post(`${api}/services`).set(auth).send(serviceInput());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ providerId: profile.id, price: 25000, unit: 'per_day', active: true });
  });

  it('validates the service', async () => {
    const { auth } = await provider('verified');
    const res = await request(app)
      .post(`${api}/services`)
      .set(auth)
      .send(serviceInput({ title: { en: ' ' }, unit: 'per_hour', price: 12.5, category: 'tents' }));
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details).sort()).toEqual(['category', 'price', 'title', 'unit']);
    expect(res.body.error.details.unit.message).toBe('The price must be per day, per item or per event.');
  });

  it('lets only the owner edit and delete, and hides deleted services', async () => {
    const { auth, profile } = await provider('verified');
    const item = await service(profile._id);
    const rival = await provider('verified');

    expect((await request(app).patch(`${api}/services/${item.id}`).set(rival.auth).send({ price: 1000 })).status).toBe(
      403,
    );
    expect((await request(app).delete(`${api}/services/${item.id}`).set(rival.auth)).status).toBe(403);

    const res = await request(app)
      .patch(`${api}/services/${item.id}`)
      .set(auth)
      .send({ price: 30000, title: { fr: 'Bâche' } });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ price: 30000, title: { fr: 'Bâche' } });
    expect(res.body.data.title.en).toBeUndefined();

    const empty = await request(app).patch(`${api}/services/${item.id}`).set(auth).send({ title: {} });
    expect(empty.status).toBe(400);

    expect((await request(app).delete(`${api}/services/${item.id}`).set(auth)).status).toBe(200);
    expect((await ServiceModel.findById(item._id))!.active).toBe(false);
    expect((await request(app).delete(`${api}/services/${item.id}`).set(auth)).status).toBe(404);
    expect((await request(app).get(`${api}/services/${item.id}`)).status).toBe(404);
    expect((await request(app).get(`${api}/services/${item.id}`).set(auth)).body.data.active).toBe(false);
  });

  it('lists my active services', async () => {
    const { auth, profile } = await provider('pending');
    const a = await service(profile._id);
    const b = await service(profile._id);
    await service(profile._id, { active: false });
    await service((await provider('verified')).profile._id);

    const res = await request(app).get(`${api}/providers/me/services?limit=1`).set(auth);
    expect(res.body.data.map((item: { id: string }) => item.id)).toEqual([b.id]);
    expect(res.body.meta).toEqual({ page: 1, limit: 1, total: 2, pages: 2 });
    expect(a.id).toBeDefined();
  });
});

describe('GET /services (SRV-4)', () => {
  it('lists active services of verified providers with filters', async () => {
    const douala = await provider('verified');
    const yaounde = await provider('verified', 'Yaoundé');
    const pending = await provider('pending');
    const canopy = await service(douala.profile._id);
    const chairs = await service(douala.profile._id, {
      category: 'chairs',
      title: { en: 'Plastic chairs', fr: 'Chaises en plastique' },
      price: 300,
      unit: 'per_item',
    });
    const sound = await service(yaounde.profile._id, {
      category: 'sound',
      title: { en: 'Sound system' },
      city: 'Yaoundé',
      price: 80000,
    });
    await service(douala.profile._id, { active: false });
    await service(pending.profile._id);

    const ids = async (query = '') =>
      (await request(app).get(`${api}/services${query}`)).body.data.map((item: { id: string }) => item.id);

    expect(await ids()).toEqual([sound.id, chairs.id, canopy.id]);
    expect(await ids('?category=chairs')).toEqual([chairs.id]);
    expect(await ids('?city=yaoundé')).toEqual([sound.id]);
    expect(await ids('?minPrice=1000&maxPrice=50000')).toEqual([canopy.id]);
    expect(await ids('?q=chairs')).toEqual([chairs.id]);

    const res = await request(app).get(`${api}/services?limit=2`);
    expect(res.body.meta).toEqual({ page: 1, limit: 2, total: 3, pages: 2 });
    expect(res.body.data[0].provider).toEqual({
      id: yaounde.profile.id,
      businessName: yaounde.profile.businessName,
      city: 'Yaoundé',
      ratingAvg: 0,
      ratingCount: 0,
    });
  });

  it('rejects a reversed price range', async () => {
    const res = await request(app).get(`${api}/services?minPrice=5000&maxPrice=100`);
    expect(res.status).toBe(400);
    expect(res.body.error.details._.message).toBe('The minimum price cannot be higher than the maximum price.');
  });

  it('shows one service with the provider contacts', async () => {
    const { profile } = await provider('verified');
    const item = await service(profile._id);
    const res = await request(app).get(`${api}/services/${item.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.provider).toMatchObject({ id: profile.id, phone: '+237677123456' });

    const pending = await provider('pending');
    const hidden = await service(pending.profile._id);
    expect((await request(app).get(`${api}/services/${hidden.id}`)).status).toBe(404);
    expect((await request(app).get(`${api}/services/${hidden.id}`).set(pending.auth)).status).toBe(200);
    expect(
      (
        await request(app)
          .get(`${api}/services/${hidden.id}`)
          .set((await createUser('admin')).auth)
      ).status,
    ).toBe(200);
  });
});

describe('GET /providers/me/earnings (SRV-7)', () => {
  it('sums successful booking payments in the date range', async () => {
    const { user, auth } = await provider('verified');
    const pay = async (type: 'service' | 'ticket', amount: number, at: Date, status = 'successful') => {
      counter += 1;
      const order = await OrderModel.create({
        type,
        buyerId: objectId(),
        payeeId: user._id,
        items: [
          {
            refId: objectId(),
            refModel: type === 'service' ? 'Booking' : 'TicketTier',
            quantity: 1,
            unitPrice: amount,
          },
        ],
        amount,
        phone: '+237677999999',
        status: 'paid',
        ...(type === 'ticket' && { eventId: objectId() }),
      });
      const tx = await TransactionModel.create({
        orderId: order._id,
        payeeId: user._id,
        provider: 'fapshi',
        externalRef: `earn-${counter}`,
        kind: 'payment',
        amount,
        commission: amount / 10,
        payeeShare: amount - amount / 10,
        status,
      });
      await TransactionModel.collection.updateOne({ _id: tx._id }, { $set: { createdAt: at } });
    };

    await pay('service', 100000, new Date('2026-10-15T10:00:00Z'));
    await pay('service', 50000, new Date('2026-11-10T10:00:00Z'));
    await pay('service', 20000, new Date('2026-11-12T10:00:00Z'), 'failed');
    await pay('ticket', 9000, new Date('2026-11-12T10:00:00Z'));

    const all = await request(app).get(`${api}/providers/me/earnings`).set(auth);
    expect(all.status).toBe(200);
    expect(all.body.data).toMatchObject({
      paidBookings: 2,
      gross: 150000,
      commission: 15000,
      net: 135000,
      refunded: 0,
    });

    const november = await request(app)
      .get(`${api}/providers/me/earnings?from=2026-11-01&to=2026-11-30T23:59:59Z`)
      .set(auth);
    expect(november.body.data).toMatchObject({ paidBookings: 1, gross: 50000, net: 45000 });

    const reversed = await request(app).get(`${api}/providers/me/earnings?from=2026-12-01&to=2026-11-01`).set(auth);
    expect(reversed.status).toBe(400);
    expect(reversed.body.error.details._.message).toBe('The start date must be before the end date.');
  });
});
