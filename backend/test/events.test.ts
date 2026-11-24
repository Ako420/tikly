import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import {
  AgendaItemModel,
  EventModel,
  NotificationModel,
  OrderModel,
  SettingModel,
  SlotBookingModel,
  SlotModel,
  TicketModel,
  TicketTierModel,
  TransactionModel,
} from '../src/model';
import { useTestDatabase } from './helpers/db';
import { createEvent, createTier, createUser, daysFromNow, eventInput, objectId } from './helpers/factories';

useTestDatabase('events');

const app = buildApp();
const api = '/api/v1';

async function publishedEvent(organizerId = objectId(), overrides: Record<string, unknown> = {}) {
  return createEvent(organizerId, { status: 'published', ...overrides });
}

async function ticketFor(event: { _id: unknown }, tier: { _id: unknown }, holderId = objectId(), status = 'valid') {
  return TicketModel.create({
    code: `EVT-${Math.random().toString(36).slice(2, 8)}`,
    qrToken: `token-${Math.random()}`,
    orderId: objectId(),
    eventId: event._id,
    tierId: tier._id,
    holderId,
    status,
  });
}

describe('POST /events', () => {
  it('creates a draft owned by the organizer (EVT-1, EVT-2)', async () => {
    const { user, auth } = await createUser('organizer');
    const res = await request(app)
      .post(`${api}/events`)
      .set(auth)
      .send({ ...eventInput({ category: 'Concert' }), status: 'published', organizerId: objectId(), ratingAvg: 5 });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      status: 'draft',
      organizerId: user.id,
      category: 'concert',
      title: { en: 'Douala Jazz Night', fr: 'Nuit du jazz de Douala' },
      ratingAvg: 0,
    });
  });

  it('accepts a title in only one language', async () => {
    const { auth } = await createUser('organizer');
    const res = await request(app)
      .post(`${api}/events`)
      .set(auth)
      .send(eventInput({ title: { fr: 'Soirée' }, description: { fr: 'Une soirée.' } }));
    expect(res.status).toBe(201);
    expect(res.body.data.title).toEqual({ fr: 'Soirée' });
  });

  it.each(['attendee', 'provider', 'exhibitor', 'staff', 'admin'] as const)('refuses %s', async (role) => {
    const { auth } = await createUser(role);
    expect((await request(app).post(`${api}/events`).set(auth).send(eventInput())).status).toBe(403);
  });

  it('needs a login', async () => {
    expect((await request(app).post(`${api}/events`).send(eventInput())).status).toBe(401);
  });

  it('explains missing and invalid fields', async () => {
    const { auth } = await createUser('organizer');
    const res = await request(app)
      .post(`${api}/events`)
      .set(auth)
      .send({ title: { en: ' ' }, coverUrl: 'ftp://cover.png', startAt: 'not a date' });
    expect(res.status).toBe(400);
    const { details } = res.body.error;
    expect(details.title.message).toBe('Give the event a title in English or French.');
    expect(details.coverUrl.message).toBe('The cover image must be a valid web address.');
    expect(details.startAt.message).toBe('Set the start date and time.');
    expect(details.venue.message).toBe('Enter the venue of the event.');
  });

  it('requires a future start and an end after the start', async () => {
    const { auth } = await createUser('organizer');
    const past = await request(app)
      .post(`${api}/events`)
      .set(auth)
      .send(eventInput({ startAt: daysFromNow(-1), endAt: daysFromNow(1) }));
    expect(past.status).toBe(400);
    expect(past.body.error.details.startAt.message).toBe('The event must start in the future.');

    const backwards = await request(app)
      .post(`${api}/events`)
      .set(auth)
      .send(eventInput({ startAt: daysFromNow(10), endAt: daysFromNow(9) }));
    expect(backwards.status).toBe(400);
    expect(backwards.body.error.details.endAt.message).toBe('The event must end after it starts.');
  });

  it('only accepts known categories, from settings when the admin set them', async () => {
    const { auth } = await createUser('organizer');
    const unknown = await request(app)
      .post(`${api}/events`)
      .set(auth)
      .send(eventInput({ category: 'rodeo' }));
    expect(unknown.status).toBe(400);
    expect(unknown.body.error.code).toBe('INVALID_CATEGORY');
    expect(unknown.body.error.details.allowed).toContain('concert');

    await SettingModel.create({ categories: [{ key: 'rodeo', en: 'Rodeo', fr: 'Rodéo' }] });
    expect(
      (
        await request(app)
          .post(`${api}/events`)
          .set(auth)
          .send(eventInput({ category: 'rodeo' }))
      ).status,
    ).toBe(201);
    expect((await request(app).post(`${api}/events`).set(auth).send(eventInput())).status).toBe(400);
  });
});

describe('PATCH /events/:id', () => {
  it('edits any field of a draft and merges one language into the title', async () => {
    const { user, auth } = await createUser('organizer');
    const event = await createEvent(user._id);
    const res = await request(app)
      .patch(`${api}/events/${event.id}`)
      .set(auth)
      .send({ title: { fr: 'Grande nuit du jazz' }, venue: 'Palais des sports', city: 'Yaoundé' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      title: { en: 'Douala Jazz Night', fr: 'Grande nuit du jazz' },
      venue: 'Palais des sports',
      city: 'Yaoundé',
      status: 'draft',
    });
  });

  it('only lets the owner edit', async () => {
    const owner = await createUser('organizer');
    const other = await createUser('organizer');
    const event = await createEvent(owner.user._id);
    const res = await request(app).patch(`${api}/events/${event.id}`).set(other.auth).send({ venue: 'Hijacked' });
    expect(res.status).toBe(403);
    expect((await EventModel.findById(event.id))!.venue).toBe('Salle des fêtes');
  });

  it('allows only description and cover changes once published', async () => {
    const { user, auth } = await createUser('organizer');
    const event = await publishedEvent(user._id);
    const allowed = await request(app)
      .patch(`${api}/events/${event.id}`)
      .set(auth)
      .send({ description: { en: 'Now with a guest band.' }, coverUrl: 'https://res.cloudinary.com/demo/cover.png' });
    expect(allowed.status).toBe(200);
    expect(allowed.body.data.status).toBe('published');

    const locked = await request(app)
      .patch(`${api}/events/${event.id}`)
      .set(auth)
      .send({ venue: 'Elsewhere', description: { en: 'x' } });
    expect(locked.status).toBe(409);
    expect(locked.body.error).toMatchObject({ code: 'EVENT_NOT_EDITABLE', details: { fields: ['venue'] } });
  });

  it.each(['pending', 'cancelled', 'completed', 'suspended'])('refuses edits while %s', async (status) => {
    const { user, auth } = await createUser('organizer');
    const event = await createEvent(user._id, { status, ...(status === 'cancelled' && { cancellationReason: 'x' }) });
    const res = await request(app)
      .patch(`${api}/events/${event.id}`)
      .set(auth)
      .send({ description: { en: 'x' } });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_NOT_EDITABLE');
  });

  it('turns an edited rejected event back into a draft', async () => {
    const { user, auth } = await createUser('organizer');
    const event = await createEvent(user._id, { status: 'rejected', rejectionReason: 'Add a venue photo' });
    const res = await request(app).patch(`${api}/events/${event.id}`).set(auth).send({ venue: 'New venue' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('draft');
  });

  it('checks dates against the stored ones and against tier sales', async () => {
    const { user, auth } = await createUser('organizer');
    const event = await createEvent(user._id);
    const beforeStart = await request(app)
      .patch(`${api}/events/${event.id}`)
      .set(auth)
      .send({ endAt: daysFromNow(5) });
    expect(beforeStart.status).toBe(400);
    expect(beforeStart.body.error.details.endAt.code).toBe('validation.event.endAt.afterStart');

    await createTier(event._id, { salesEndAt: daysFromNow(29) });
    const res = await request(app)
      .patch(`${api}/events/${event.id}`)
      .set(auth)
      .send({ startAt: daysFromNow(20), endAt: daysFromNow(21) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TIER_SALES_END_AFTER_START');
  });

  it('rejects an empty update and a bad id', async () => {
    const { user, auth } = await createUser('organizer');
    const event = await createEvent(user._id);
    expect(
      (await request(app).patch(`${api}/events/${event.id}`).set(auth).send({})).body.error.details._.message,
    ).toBe('Send at least one field to update.');
    expect((await request(app).patch(`${api}/events/nope`).set(auth).send({ venue: 'x' })).status).toBe(400);
    expect((await request(app).patch(`${api}/events/${objectId()}`).set(auth).send({ venue: 'x' })).status).toBe(404);
  });
});

describe('DELETE /events/:id', () => {
  it('deletes a draft with its tiers, agenda and slots', async () => {
    const { user, auth } = await createUser('organizer');
    const event = await createEvent(user._id);
    await createTier(event._id);
    await AgendaItemModel.create({
      eventId: event._id,
      title: 'Doors open',
      startAt: daysFromNow(30),
      endAt: daysFromNow(30.1),
    });
    await SlotModel.create({ eventId: event._id, label: 'A1', price: 10000, quantity: 2 });

    const res = await request(app).delete(`${api}/events/${event.id}`).set(auth);
    expect(res.status).toBe(200);
    expect(await EventModel.countDocuments()).toBe(0);
    expect(await TicketTierModel.countDocuments()).toBe(0);
    expect(await AgendaItemModel.countDocuments()).toBe(0);
    expect(await SlotModel.countDocuments()).toBe(0);
  });

  it('keeps anything that is not a draft', async () => {
    const { user, auth } = await createUser('organizer');
    const event = await publishedEvent(user._id);
    const res = await request(app).delete(`${api}/events/${event.id}`).set(auth);
    expect(res.status).toBe(409);
    expect(await EventModel.countDocuments()).toBe(1);
  });
});

describe('POST /events/:id/submit', () => {
  it('needs at least one ticket tier', async () => {
    const { user, auth } = await createUser('organizer');
    const event = await createEvent(user._id);
    const res = await request(app).post(`${api}/events/${event.id}/submit`).set(auth);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('EVENT_NEEDS_TIERS');
  });

  it('moves the event to pending and notifies active admins', async () => {
    const { user, auth } = await createUser('organizer');
    const admin = await createUser('admin');
    await createUser('admin', { status: 'suspended' });
    const event = await createEvent(user._id, { status: 'rejected', rejectionReason: 'Missing details' });
    await createTier(event._id);

    const res = await request(app).post(`${api}/events/${event.id}/submit`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending');
    expect(res.body.data.rejectionReason).toBeUndefined();

    const notifications = await NotificationModel.find().lean();
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({ type: 'event_pending', eventId: event._id, userId: admin.user._id });
  });

  it('refuses events already pending or published', async () => {
    const { user, auth } = await createUser('organizer');
    for (const status of ['pending', 'published']) {
      const event = await createEvent(user._id, { status });
      await createTier(event._id);
      expect((await request(app).post(`${api}/events/${event.id}/submit`).set(auth)).body.error.code).toBe(
        'EVENT_NOT_EDITABLE',
      );
    }
  });

  it('refuses a draft whose start time has passed', async () => {
    const { user, auth } = await createUser('organizer');
    const event = await createEvent(user._id);
    await createTier(event._id, { salesEndAt: daysFromNow(1) });
    await EventModel.updateOne({ _id: event._id }, { startAt: daysFromNow(-1) });
    expect((await request(app).post(`${api}/events/${event.id}/submit`).set(auth)).body.error.code).toBe(
      'EVENT_ALREADY_STARTED',
    );
  });
});

describe('POST /events/:id/cancel', () => {
  it('cancels a published event and notifies each ticket holder once (EVT-8)', async () => {
    const { user, auth } = await createUser('organizer');
    const event = await publishedEvent(user._id);
    const tier = await createTier(event._id);
    const holder = objectId();
    await ticketFor(event, tier, holder);
    await ticketFor(event, tier, holder, 'checked_in');
    await ticketFor(event, tier, objectId(), 'refunded');

    const res = await request(app).post(`${api}/events/${event.id}/cancel`).set(auth).send({ reason: 'Venue flooded' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'cancelled', cancellationReason: 'Venue flooded' });

    const notifications = await NotificationModel.find({ type: 'event_cancelled' }).lean();
    expect(notifications.map((n) => String(n.userId))).toEqual([String(holder)]);
    expect(notifications[0]!.payload).toMatchObject({ reason: 'Venue flooded' });
  });

  it('needs a reason and a published event', async () => {
    const { user, auth } = await createUser('organizer');
    const draft = await createEvent(user._id);
    expect(
      (await request(app).post(`${api}/events/${draft.id}/cancel`).set(auth).send({})).body.error.details.reason
        .message,
    ).toBe('Give a reason for cancelling the event.');
    const res = await request(app).post(`${api}/events/${draft.id}/cancel`).set(auth).send({ reason: 'x' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_NOT_CANCELLABLE');
  });
});

describe('GET /events', () => {
  it('lists only upcoming published events, soonest first, with the lowest price (EVT-4, EVT-7)', async () => {
    const organizer = objectId();
    const later = await publishedEvent(organizer, { startAt: daysFromNow(40), endAt: daysFromNow(41) });
    const soon = await publishedEvent(organizer, { startAt: daysFromNow(5), endAt: daysFromNow(6) });
    await createTier(soon._id, { name: 'vip', price: 20000, salesEndAt: daysFromNow(4) });
    await createTier(soon._id, { price: 3000, salesEndAt: daysFromNow(4) });
    await createEvent(organizer);
    await createEvent(organizer, { status: 'pending' });
    const past = await publishedEvent(organizer);
    await EventModel.updateOne({ _id: past._id }, { startAt: daysFromNow(-3), endAt: daysFromNow(-2) });

    const res = await request(app).get(`${api}/events`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((e: { id: string }) => e.id)).toEqual([soon.id, later.id]);
    expect(res.body.data[0].priceFrom).toBe(3000);
    expect(res.body.data[1].priceFrom).toBeNull();
    expect(res.body.meta).toEqual({ page: 1, limit: 20, total: 2, pages: 1 });
  });

  it('filters by city (any case), country, category, dates and keyword', async () => {
    const organizer = objectId();
    const douala = await publishedEvent(organizer);
    const yaounde = await publishedEvent(organizer, {
      city: 'Yaoundé',
      category: 'conference',
      title: { en: 'Tech Summit' },
      description: { en: 'Developers meet.' },
      startAt: daysFromNow(60),
      endAt: daysFromNow(61),
    });
    const ids = async (query: string) =>
      (await request(app).get(`${api}/events?${query}`)).body.data.map((e: { id: string }) => e.id);

    expect(await ids('city=douala')).toEqual([douala.id]);
    expect(await ids(`city=${encodeURIComponent('YAOUNDÉ')}`)).toEqual([yaounde.id]);
    expect(await ids('category=Conference')).toEqual([yaounde.id]);
    expect(await ids('country=cameroon')).toEqual([douala.id, yaounde.id]);
    expect(await ids('q=summit')).toEqual([yaounde.id]);
    expect(await ids('q=fleuve')).toEqual([douala.id]);
    expect(await ids(`from=${daysFromNow(45).toISOString()}`)).toEqual([yaounde.id]);
    expect(await ids(`to=${daysFromNow(45).toISOString()}`)).toEqual([douala.id]);
    expect(await ids('city=.*')).toEqual([]);
  });

  it('pages results', async () => {
    const organizer = objectId();
    for (let day = 1; day <= 3; day += 1) {
      await publishedEvent(organizer, { startAt: daysFromNow(day), endAt: daysFromNow(day + 0.5) });
    }
    const res = await request(app).get(`${api}/events?page=2&limit=2`);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, pages: 2 });
    expect((await request(app).get(`${api}/events?limit=500`)).status).toBe(400);
  });
});

describe('GET /events/:id', () => {
  it('shows a published event with tiers, remaining tickets, agenda and exhibitors (EVT-5)', async () => {
    const event = await publishedEvent();
    await createTier(event._id, { name: 'vip', price: 15000, quantity: 10, sold: 7, reserved: 2 });
    await createTier(event._id, { price: 5000, quantity: 5, sold: 5 });
    await AgendaItemModel.create({
      eventId: event._id,
      title: 'Headliner',
      startAt: daysFromNow(30.1),
      endAt: daysFromNow(30.15),
    });
    await AgendaItemModel.create({
      eventId: event._id,
      title: 'Doors',
      startAt: daysFromNow(30),
      endAt: daysFromNow(30.05),
    });
    const slot = await SlotModel.create({ eventId: event._id, label: 'Stand A', price: 20000, quantity: 3 });
    const exhibitor = await createUser('exhibitor', { name: 'Kmer Crafts' });
    await SlotBookingModel.create({
      slotId: slot._id,
      exhibitorId: exhibitor.user._id,
      orderId: objectId(),
      quantity: 1,
      status: 'paid',
    });
    await SlotBookingModel.create({
      slotId: slot._id,
      exhibitorId: objectId(),
      orderId: objectId(),
      quantity: 1,
      status: 'pending',
    });

    const res = await request(app).get(`${api}/events/${event.id}`);
    expect(res.status).toBe(200);
    const { tiers, agenda, exhibitors } = res.body.data;
    expect(tiers).toEqual([
      expect.objectContaining({ name: 'standard', price: 5000, available: 0, onSale: false }),
      expect.objectContaining({ name: 'vip', price: 15000, available: 1, onSale: true }),
    ]);
    expect(tiers[0].sold).toBeUndefined();
    expect(agenda.map((item: { title: string }) => item.title)).toEqual(['Doors', 'Headliner']);
    expect(exhibitors).toEqual([{ name: 'Kmer Crafts', slot: 'Stand A', quantity: 1 }]);
  });

  it('hides unpublished events from everyone but the owner and admins', async () => {
    const owner = await createUser('organizer');
    const other = await createUser('organizer');
    const admin = await createUser('admin');
    const draft = await createEvent(owner.user._id);

    expect((await request(app).get(`${api}/events/${draft.id}`)).status).toBe(404);
    expect((await request(app).get(`${api}/events/${draft.id}`).set(other.auth)).status).toBe(404);
    expect((await request(app).get(`${api}/events/${draft.id}`).set(owner.auth)).status).toBe(200);
    expect((await request(app).get(`${api}/events/${draft.id}`).set(admin.auth)).status).toBe(200);
  });

  it('shows completed events publicly', async () => {
    const event = await createEvent(objectId(), { status: 'completed' });
    expect((await request(app).get(`${api}/events/${event.id}`)).status).toBe(200);
  });
});

describe('GET /organizer/events', () => {
  it('lists only the caller’s events, newest first, by status', async () => {
    const { user, auth } = await createUser('organizer');
    const first = await createEvent(user._id);
    const second = await createEvent(user._id, { status: 'published' });
    await createEvent(objectId());

    const all = await request(app).get(`${api}/organizer/events`).set(auth);
    expect(all.body.data.map((e: { id: string }) => e.id)).toEqual([second.id, first.id]);
    const drafts = await request(app).get(`${api}/organizer/events?status=draft`).set(auth);
    expect(drafts.body.data.map((e: { id: string }) => e.id)).toEqual([first.id]);
    expect(drafts.body.meta.total).toBe(1);
  });

  it('is for organizers only', async () => {
    const { auth } = await createUser('attendee');
    expect((await request(app).get(`${api}/organizer/events`).set(auth)).status).toBe(403);
  });
});

describe('GET /events/:id/stats', () => {
  it('reports sales, money and check-ins per tier from the ledger (ACC-6)', async () => {
    const { user, auth } = await createUser('organizer');
    const event = await publishedEvent(user._id);
    const vip = await createTier(event._id, { name: 'vip', price: 10000, quantity: 20, sold: 3 });
    const standard = await createTier(event._id, { price: 5000, quantity: 50, sold: 2, reserved: 1 });
    await ticketFor(event, vip, objectId(), 'checked_in');
    await ticketFor(event, vip, objectId(), 'checked_in');
    await ticketFor(event, standard, objectId(), 'checked_in');
    await ticketFor(event, standard);

    const order = await OrderModel.create({
      type: 'ticket',
      buyerId: objectId(),
      payeeId: user._id,
      eventId: event._id,
      items: [{ refId: vip._id, refModel: 'TicketTier', quantity: 3, unitPrice: 10000 }],
      amount: 30000,
      phone: '+237677000000',
      status: 'paid',
    });
    await TransactionModel.create([
      {
        orderId: order._id,
        provider: 'campay',
        externalRef: 'pay-1',
        kind: 'payment',
        amount: 30000,
        commission: 3000,
        payeeShare: 27000,
        status: 'successful',
      },
      { orderId: order._id, provider: 'campay', externalRef: 'pay-2', kind: 'payment', amount: 9999, status: 'failed' },
      {
        orderId: order._id,
        provider: 'campay',
        externalRef: 'ref-1',
        kind: 'refund',
        amount: 5000,
        status: 'successful',
      },
    ]);

    const res = await request(app).get(`${api}/events/${event.id}/stats`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.tiers).toEqual([
      expect.objectContaining({ name: 'standard', sold: 2, reserved: 1, available: 47, checkedIn: 1 }),
      expect.objectContaining({ name: 'vip', sold: 3, reserved: 0, available: 17, checkedIn: 2 }),
    ]);
    expect(res.body.data.totals).toEqual({
      ticketsSold: 5,
      checkedIn: 3,
      gross: 30000,
      commission: 3000,
      net: 27000,
      refunded: 5000,
    });
  });

  it('is visible to the owner and admins only', async () => {
    const owner = await createUser('organizer');
    const event = await publishedEvent(owner.user._id);
    expect(
      (
        await request(app)
          .get(`${api}/events/${event.id}/stats`)
          .set((await createUser('organizer')).auth)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get(`${api}/events/${event.id}/stats`)
          .set((await createUser('admin')).auth)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get(`${api}/events/${event.id}/stats`)
          .set((await createUser('attendee')).auth)
      ).status,
    ).toBe(403);
  });
});

describe('GET /events/:id/share', () => {
  it('builds share links in the reader’s language (EVT-6)', async () => {
    const event = await publishedEvent();
    const url = `https://tikly.test/events/${event.id}`;
    const res = await request(app).get(`${api}/events/${event.id}/share`).set('Accept-Language', 'fr');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({
      url,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`Nuit du jazz de Douala ${url}`)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    });
  });

  it('does not share unpublished events', async () => {
    const event = await createEvent(objectId());
    expect((await request(app).get(`${api}/events/${event.id}/share`)).status).toBe(404);
  });
});

describe('GET /categories', () => {
  it('returns the default categories until the admin sets some', async () => {
    const defaults = await request(app).get(`${api}/categories`);
    expect(defaults.status).toBe(200);
    expect(defaults.body.data).toContainEqual({ key: 'conference', en: 'Conference', fr: 'Conférence' });

    await SettingModel.create({ categories: [{ key: 'gala', en: 'Gala', fr: 'Gala' }] });
    expect((await request(app).get(`${api}/categories`)).body.data).toEqual([{ key: 'gala', en: 'Gala', fr: 'Gala' }]);
  });
});
