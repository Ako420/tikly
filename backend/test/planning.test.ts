import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { BookingModel, BudgetItemModel, GuestModel, OrderModel, TicketModel, TransactionModel } from '../src/model';
import { useTestDatabase } from './helpers/db';
import { createEvent, createTier, createUser, daysFromNow, objectId } from './helpers/factories';

useTestDatabase('planning');

const app = buildApp();
const api = '/api/v1';
const HOUR = 60 * 60 * 1000;

async function ownerWithEvent(overrides: Record<string, unknown> = {}) {
  const owner = await createUser('organizer');
  const event = await createEvent(owner.user._id, overrides);
  const base = `${api}/events/${event.id}`;
  return { ...owner, event, base };
}

async function paidOrder(event: { _id: unknown }, type: 'ticket' | 'slot', payeeShare: number, status = 'paid') {
  const order = await OrderModel.create({
    type,
    buyerId: objectId(),
    payeeId: objectId(),
    eventId: event._id,
    items: [
      { refId: objectId(), refModel: type === 'ticket' ? 'TicketTier' : 'Slot', quantity: 1, unitPrice: payeeShare },
    ],
    amount: payeeShare + 1000,
    phone: '+237677000000',
    status,
  });
  await TransactionModel.create({
    orderId: order._id,
    provider: 'campay',
    externalRef: `ref-${order.id}`,
    kind: 'payment',
    amount: payeeShare + 1000,
    commission: 1000,
    payeeShare,
    status: 'successful',
  });
  return order;
}

describe('planning access', () => {
  it('is for the event owner only, with read access for admins', async () => {
    const { event, base } = await ownerWithEvent();
    const other = await createUser('organizer');
    const admin = await createUser('admin');
    const attendee = await createUser('attendee');

    for (const path of ['budget', 'checklist', 'guests']) {
      expect((await request(app).get(`${base}/${path}`)).status).toBe(401);
      expect((await request(app).get(`${base}/${path}`).set(other.auth)).status).toBe(403);
      expect((await request(app).get(`${base}/${path}`).set(attendee.auth)).status).toBe(403);
      expect((await request(app).get(`${base}/${path}`).set(admin.auth)).status).toBe(200);
    }
    expect((await request(app).post(`${base}/checklist`).set(admin.auth).send({ title: 'x' })).status).toBe(403);
    expect((await request(app).get(`${api}/events/${objectId()}/budget`).set(other.auth)).status).toBe(404);
    expect(event.id).toBeDefined();
  });

  it('cannot reach another event’s items through your own event', async () => {
    const mine = await ownerWithEvent();
    const theirs = await ownerWithEvent();
    const item = await BudgetItemModel.create({
      eventId: theirs.event._id,
      label: 'Hall',
      category: 'venue',
      planned: 100,
    });
    const res = await request(app).patch(`${mine.base}/budget/${item.id}`).set(mine.auth).send({ actual: 1 });
    expect(res.status).toBe(404);
    expect((await request(app).delete(`${mine.base}/budget/${item.id}`).set(mine.auth)).status).toBe(404);
    expect((await BudgetItemModel.findById(item.id))!.actual).toBe(0);
  });
});

describe('budget (PLN-1, PLN-2)', () => {
  it('adds, edits and removes expense lines and totals them', async () => {
    const { auth, base } = await ownerWithEvent();
    const hall = await request(app)
      .post(`${base}/budget`)
      .set(auth)
      .send({ label: 'Hall rental', category: 'venue', planned: 300000 });
    expect(hall.status).toBe(201);
    expect(hall.body.data).toMatchObject({ label: 'Hall rental', planned: 300000, actual: 0, source: 'manual' });
    await request(app)
      .post(`${base}/budget`)
      .set(auth)
      .send({ label: 'Sound', category: 'tech', planned: 100000, actual: 120000 });

    const edited = await request(app).patch(`${base}/budget/${hall.body.data.id}`).set(auth).send({ actual: 280000 });
    expect(edited.body.data.actual).toBe(280000);

    const budget = await request(app).get(`${base}/budget`).set(auth);
    expect(budget.body.data.items.map((item: { label: string }) => item.label)).toEqual(['Hall rental', 'Sound']);
    expect(budget.body.data.totals).toEqual({
      planned: 400000,
      actual: 400000,
      income: { tickets: 0, slots: 0 },
      balance: -400000,
    });

    expect((await request(app).delete(`${base}/budget/${hall.body.data.id}`).set(auth)).status).toBe(200);
    expect((await request(app).get(`${base}/budget`).set(auth)).body.data.items).toHaveLength(1);
  });

  it('adds the organizer’s share of paid ticket and slot sales as income', async () => {
    const { auth, base, event } = await ownerWithEvent({ status: 'published' });
    await paidOrder(event, 'ticket', 27000);
    await paidOrder(event, 'ticket', 9000);
    await paidOrder(event, 'slot', 18000);
    await paidOrder(event, 'ticket', 50000, 'refunded');
    await paidOrder(await createEvent(objectId()), 'ticket', 99000);
    await request(app)
      .post(`${base}/budget`)
      .set(auth)
      .send({ label: 'Hall', category: 'venue', planned: 20000, actual: 20000 });

    const { totals } = (await request(app).get(`${base}/budget`).set(auth)).body.data;
    expect(totals.income).toEqual({ tickets: 36000, slots: 18000 });
    expect(totals.balance).toBe(34000);
  });

  it('rejects decimals and negative amounts', async () => {
    const { auth, base } = await ownerWithEvent();
    const res = await request(app)
      .post(`${base}/budget`)
      .set(auth)
      .send({ label: 'Chairs', category: 'rentals', planned: 10.5, actual: -1 });
    expect(res.status).toBe(400);
    expect(res.body.error.details.planned.message).toBe('Amounts must be whole francs (XAF), with no decimals.');
    expect(res.body.error.details.actual.message).toBe('The actual amount cannot be negative.');
  });

  it('links an accepted or paid marketplace booking (PLN-6)', async () => {
    const { user, auth, base, event } = await ownerWithEvent();
    const booking = await BookingModel.create({
      serviceId: objectId(),
      organizerId: user._id,
      eventId: event._id,
      startDate: daysFromNow(29),
      endDate: daysFromNow(30),
      quantity: 2,
      amount: 80000,
      status: 'paid',
    });
    const res = await request(app)
      .post(`${base}/budget`)
      .set(auth)
      .send({ label: 'Canopies', category: 'rentals', planned: 90000, bookingId: booking.id });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ source: 'service', bookingId: booking.id, actual: 80000 });

    const again = await request(app)
      .post(`${base}/budget`)
      .set(auth)
      .send({ label: 'Again', category: 'rentals', planned: 1, bookingId: booking.id });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('BOOKING_ALREADY_LINKED');
  });

  it('refuses bookings that are not yours, not accepted, or for another event', async () => {
    const { user, auth, base } = await ownerWithEvent();
    const booking = (overrides: Record<string, unknown>) =>
      BookingModel.create({
        serviceId: objectId(),
        organizerId: user._id,
        startDate: daysFromNow(29),
        endDate: daysFromNow(30),
        quantity: 1,
        amount: 1000,
        status: 'accepted',
        ...overrides,
      });
    for (const candidate of [
      await booking({ organizerId: objectId() }),
      await booking({ status: 'requested', amount: undefined }),
      await booking({ eventId: objectId() }),
    ]) {
      const res = await request(app)
        .post(`${base}/budget`)
        .set(auth)
        .send({ label: 'x', category: 'y', planned: 1, bookingId: candidate.id });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BOOKING_NOT_LINKABLE');
    }
  });
});

describe('checklist (PLN-3)', () => {
  it('tracks tasks by due date and reports progress', async () => {
    const { auth, base } = await ownerWithEvent();
    const book = await request(app)
      .post(`${base}/checklist`)
      .set(auth)
      .send({ title: 'Book the hall', dueAt: daysFromNow(10) });
    await request(app).post(`${base}/checklist`).set(auth).send({ title: 'Print flyers' });
    await request(app)
      .post(`${base}/checklist`)
      .set(auth)
      .send({ title: 'Hire security', dueAt: daysFromNow(5) });

    await request(app).patch(`${base}/checklist/${book.body.data.id}`).set(auth).send({ done: true });
    const res = await request(app).get(`${base}/checklist`).set(auth);
    expect(res.body.data.items.map((item: { title: string }) => item.title)).toEqual([
      'Hire security',
      'Book the hall',
      'Print flyers',
    ]);
    expect(res.body.data.progress).toBe(33);
  });

  it('can clear a due date and reports 0% for an empty list', async () => {
    const { auth, base } = await ownerWithEvent();
    expect((await request(app).get(`${base}/checklist`).set(auth)).body.data).toEqual({ items: [], progress: 0 });
    const task = await request(app)
      .post(`${base}/checklist`)
      .set(auth)
      .send({ title: 'Call DJ', dueAt: daysFromNow(3) });
    const cleared = await request(app).patch(`${base}/checklist/${task.body.data.id}`).set(auth).send({ dueAt: null });
    expect(cleared.body.data.dueAt).toBeUndefined();
    expect(
      (await request(app).post(`${base}/checklist`).set(auth).send({ title: ' ' })).body.error.details.title.message,
    ).toBe('Give the task a title.');
  });
});

describe('guest list (PLN-4)', () => {
  it('adds, finds, edits and removes guests', async () => {
    const { auth, base } = await ownerWithEvent();
    const ama = await request(app)
      .post(`${base}/guests`)
      .set(auth)
      .send({ name: 'Ama Ngono', phone: '677 12 34 56', email: 'AMA@example.cm', category: 'VIP' });
    expect(ama.status).toBe(201);
    expect(ama.body.data).toMatchObject({
      phone: '+237677123456',
      email: 'ama@example.cm',
      category: 'vip',
      source: 'manual',
    });
    await request(app).post(`${base}/guests`).set(auth).send({ name: 'Bello Speaker', category: 'speaker' });

    const search = async (query: string) =>
      (await request(app).get(`${base}/guests?${query}`).set(auth)).body.data.map((g: { name: string }) => g.name);
    expect(await search('')).toEqual(['Ama Ngono', 'Bello Speaker']);
    expect(await search('q=ngono')).toEqual(['Ama Ngono']);
    expect(await search('q=677123')).toEqual(['Ama Ngono']);
    expect(await search('category=Speaker')).toEqual(['Bello Speaker']);
    expect(await search('q=(')).toEqual([]);

    const edited = await request(app)
      .patch(`${base}/guests/${ama.body.data.id}`)
      .set(auth)
      .send({ email: null, category: 'press' });
    expect(edited.body.data.email).toBeUndefined();
    expect(edited.body.data.category).toBe('press');
    expect((await request(app).delete(`${base}/guests/${ama.body.data.id}`).set(auth)).status).toBe(200);
    expect(await GuestModel.countDocuments()).toBe(1);
  });

  it('pages the guest list', async () => {
    const { auth, base } = await ownerWithEvent();
    for (const name of ['A', 'B', 'C'])
      await request(app)
        .post(`${base}/guests`)
        .set(auth)
        .send({ name: `Guest ${name}`, category: 'vip' });
    const res = await request(app).get(`${base}/guests?limit=2&page=2`).set(auth);
    expect(res.body.data.map((g: { name: string }) => g.name)).toEqual(['Guest C']);
    expect(res.body.meta).toEqual({ page: 2, limit: 2, total: 3, pages: 2 });
  });

  it('imports ticket buyers once, with their best tier, skipping known guests', async () => {
    const { auth, base, event } = await ownerWithEvent({ status: 'published' });
    const vip = await createTier(event._id, { name: 'vip' });
    const standard = await createTier(event._id);
    const ama = await createUser('attendee', { name: 'Ama' });
    const bello = await createUser('attendee', { name: 'Bello' });
    const known = await createUser('attendee', { name: 'Known' });
    const refunded = await createUser('attendee', { name: 'Refunded' });
    const ticket = (holder: { _id: unknown }, tier: { _id: unknown }, status = 'valid') =>
      TicketModel.create({
        code: `EVT-${Math.random().toString(36).slice(2, 8)}`,
        qrToken: `qr-${Math.random()}`,
        orderId: objectId(),
        eventId: event._id,
        tierId: tier._id,
        holderId: holder._id,
        status,
      });
    await ticket(ama.user, standard);
    await ticket(ama.user, vip, 'checked_in');
    await ticket(bello.user, standard);
    await ticket(known.user, standard);
    await ticket(refunded.user, vip, 'refunded');
    await GuestModel.create({ eventId: event._id, name: 'Already here', phone: known.user.phone, category: 'friend' });

    const first = await request(app).post(`${base}/guests/import-buyers`).set(auth);
    expect(first.body.data).toEqual({ imported: 2, skipped: 1 });
    const guests = await GuestModel.find({ source: 'ticket' }).sort({ name: 1 }).lean();
    expect(guests.map((g) => [g.name, g.category, g.email])).toEqual([
      ['Ama', 'vip', ama.user.email],
      ['Bello', 'standard', bello.user.email],
    ]);

    const second = await request(app).post(`${base}/guests/import-buyers`).set(auth);
    expect(second.body.data).toEqual({ imported: 0, skipped: 3 });
    expect(await GuestModel.countDocuments()).toBe(3);
  });

  it('imports nothing when there are no buyers', async () => {
    const { auth, base } = await ownerWithEvent();
    expect((await request(app).post(`${base}/guests/import-buyers`).set(auth)).body.data).toEqual({
      imported: 0,
      skipped: 0,
    });
  });
});

describe('agenda (PLN-5)', () => {
  it('adds sessions inside the event and lists them by start time', async () => {
    const { auth, base, event } = await ownerWithEvent();
    const start = event.startAt.getTime();
    const second = await request(app)
      .post(`${base}/agenda`)
      .set(auth)
      .send({
        title: 'Headliner',
        startAt: new Date(start + 2 * HOUR),
        endAt: new Date(start + 3 * HOUR),
        speaker: 'Manu',
      });
    expect(second.status).toBe(201);
    await request(app)
      .post(`${base}/agenda`)
      .set(auth)
      .send({ title: 'Doors open', startAt: new Date(start), endAt: new Date(start + HOUR) });

    const res = await request(app).get(`${base}/agenda`).set(auth);
    expect(res.body.data.map((item: { title: string }) => item.title)).toEqual(['Doors open', 'Headliner']);
  });

  it('keeps sessions within the event dates and after their own start', async () => {
    const { auth, base, event } = await ownerWithEvent();
    const start = event.startAt.getTime();
    const early = await request(app)
      .post(`${base}/agenda`)
      .set(auth)
      .send({ title: 'Too early', startAt: new Date(start - HOUR), endAt: new Date(start + HOUR) });
    expect(early.status).toBe(400);
    expect(early.body.error.code).toBe('AGENDA_OUTSIDE_EVENT');

    const item = await request(app)
      .post(`${base}/agenda`)
      .set(auth)
      .send({ title: 'Talk', startAt: new Date(start), endAt: new Date(start + HOUR) });
    const late = await request(app)
      .patch(`${base}/agenda/${item.body.data.id}`)
      .set(auth)
      .send({ endAt: new Date(start + 10 * HOUR) });
    expect(late.body.error.code).toBe('AGENDA_OUTSIDE_EVENT');
    const backwards = await request(app)
      .patch(`${base}/agenda/${item.body.data.id}`)
      .set(auth)
      .send({ endAt: new Date(start - 1) });
    expect(backwards.status).toBe(400);

    const edited = await request(app)
      .patch(`${base}/agenda/${item.body.data.id}`)
      .set(auth)
      .send({ title: 'Keynote', speaker: null });
    expect(edited.body.data.title).toBe('Keynote');
    expect((await request(app).delete(`${base}/agenda/${item.body.data.id}`).set(auth)).status).toBe(200);
  });

  it('is public once the event is published, private before', async () => {
    const draft = await ownerWithEvent();
    expect((await request(app).get(`${draft.base}/agenda`)).status).toBe(404);
    expect((await request(app).get(`${draft.base}/agenda`).set(draft.auth)).status).toBe(200);

    const published = await ownerWithEvent({ status: 'published' });
    expect((await request(app).get(`${published.base}/agenda`)).status).toBe(200);
    const stranger = await createUser('organizer');
    const start = published.event.startAt.getTime();
    const session = { title: 'Hijack', startAt: new Date(start), endAt: new Date(start + HOUR) };
    expect((await request(app).post(`${published.base}/agenda`).set(stranger.auth).send(session)).status).toBe(403);
  });
});
