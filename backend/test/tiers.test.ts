import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { TicketTierModel } from '../src/model';
import { useTestDatabase } from './helpers/db';
import { createEvent, createTier, createUser, daysFromNow, objectId } from './helpers/factories';

useTestDatabase('tiers');

const app = buildApp();
const api = '/api/v1';

const tierInput = (overrides: Record<string, unknown> = {}) => ({
  name: 'vip',
  price: 15000,
  quantity: 50,
  salesEndAt: daysFromNow(29).toISOString(),
  ...overrides,
});

async function ownerWithEvent(overrides: Record<string, unknown> = {}) {
  const owner = await createUser('organizer');
  const event = await createEvent(owner.user._id, overrides);
  return { ...owner, event };
}

describe('POST /events/:eventId/tiers', () => {
  it('adds a tier to a draft event (TKT-1)', async () => {
    const { auth, event } = await ownerWithEvent();
    const res = await request(app).post(`${api}/events/${event.id}/tiers`).set(auth).send(tierInput());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'vip',
      price: 15000,
      quantity: 50,
      available: 50,
      sold: 0,
      reserved: 0,
    });
  });

  it('allows free tiers', async () => {
    const { auth, event } = await ownerWithEvent();
    const res = await request(app)
      .post(`${api}/events/${event.id}/tiers`)
      .set(auth)
      .send(tierInput({ price: 0 }));
    expect(res.status).toBe(201);
    expect(res.body.data.price).toBe(0);
  });

  it('allows one tier per name, so three at most', async () => {
    const { auth, event } = await ownerWithEvent();
    for (const name of ['standard', 'vip', 'vvip']) {
      expect(
        (await request(app).post(`${api}/events/${event.id}/tiers`).set(auth).send(tierInput({ name }))).status,
      ).toBe(201);
    }
    const again = await request(app)
      .post(`${api}/events/${event.id}/tiers`)
      .set(auth)
      .send(tierInput({ name: 'vip' }));
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('TIER_EXISTS');
    const unknown = await request(app)
      .post(`${api}/events/${event.id}/tiers`)
      .set(auth)
      .send(tierInput({ name: 'gold' }));
    expect(unknown.body.error.details.name.message).toBe('The tier must be Standard, VIP or VVIP.');
  });

  it('rejects decimals, negative prices and empty tiers', async () => {
    const { auth, event } = await ownerWithEvent();
    const res = await request(app)
      .post(`${api}/events/${event.id}/tiers`)
      .set(auth)
      .send(tierInput({ price: 1500.5, quantity: 0 }));
    expect(res.status).toBe(400);
    expect(res.body.error.details.price.message).toBe('Amounts must be whole francs (XAF), with no decimals.');
    expect(res.body.error.details.quantity.message).toBe('A tier needs at least 1 ticket.');
    const negative = await request(app)
      .post(`${api}/events/${event.id}/tiers`)
      .set(auth)
      .send(tierInput({ price: -1 }));
    expect(negative.body.error.details.price.message).toBe('The price cannot be negative.');
  });

  it('ends sales in the future and no later than the event start', async () => {
    const { auth, event } = await ownerWithEvent();
    const past = await request(app)
      .post(`${api}/events/${event.id}/tiers`)
      .set(auth)
      .send(tierInput({ salesEndAt: daysFromNow(-1).toISOString() }));
    expect(past.body.error.details.salesEndAt.message).toBe('Ticket sales must end in the future.');

    const late = await request(app)
      .post(`${api}/events/${event.id}/tiers`)
      .set(auth)
      .send(tierInput({ salesEndAt: daysFromNow(31).toISOString() }));
    expect(late.status).toBe(400);
    expect(late.body.error.code).toBe('SALES_END_AFTER_EVENT_START');
  });

  it.each(['pending', 'published'])('refuses new tiers once the event is %s', async (status) => {
    const { auth, event } = await ownerWithEvent({ status });
    const res = await request(app).post(`${api}/events/${event.id}/tiers`).set(auth).send(tierInput());
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EVENT_NOT_EDITABLE');
  });

  it('only lets the event owner add tiers', async () => {
    const { event } = await ownerWithEvent();
    const other = await createUser('organizer');
    expect((await request(app).post(`${api}/events/${event.id}/tiers`).set(other.auth).send(tierInput())).status).toBe(
      403,
    );
    const attendee = await createUser('attendee');
    expect(
      (await request(app).post(`${api}/events/${event.id}/tiers`).set(attendee.auth).send(tierInput())).status,
    ).toBe(403);
    expect(
      (await request(app).post(`${api}/events/${objectId()}/tiers`).set(other.auth).send(tierInput())).status,
    ).toBe(404);
  });
});

describe('GET /events/:eventId/tiers', () => {
  it('shows remaining tickets publicly, without sales figures', async () => {
    const event = await createEvent(objectId(), { status: 'published' });
    await createTier(event._id, { name: 'vip', price: 15000, quantity: 10, sold: 6, reserved: 3 });
    await createTier(event._id, { price: 5000 });
    const res = await request(app).get(`${api}/events/${event.id}/tiers`);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([
      expect.objectContaining({ name: 'standard', available: 100, onSale: true }),
      expect.objectContaining({ name: 'vip', available: 1, onSale: true }),
    ]);
    expect(res.body.data[1].sold).toBeUndefined();
  });

  it('shows sold and reserved counts to the owner, even for a draft', async () => {
    const { auth, event } = await ownerWithEvent();
    await createTier(event._id, { sold: 0, reserved: 2 });
    expect((await request(app).get(`${api}/events/${event.id}/tiers`)).status).toBe(404);
    const res = await request(app).get(`${api}/events/${event.id}/tiers`).set(auth);
    expect(res.body.data[0]).toMatchObject({ reserved: 2, available: 98 });
  });
});

describe('PATCH /tiers/:id', () => {
  it('changes price, quantity and sales end', async () => {
    const { auth, event } = await ownerWithEvent();
    const tier = await createTier(event._id);
    const salesEndAt = daysFromNow(20).toISOString();
    const res = await request(app)
      .patch(`${api}/tiers/${tier.id}`)
      .set(auth)
      .send({ price: 6000, quantity: 120, salesEndAt });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ price: 6000, quantity: 120, salesEndAt });
  });

  it('lets a published event grow a tier', async () => {
    const { auth, event } = await ownerWithEvent({ status: 'published' });
    const tier = await createTier(event._id, { sold: 100, quantity: 100 });
    const res = await request(app).patch(`${api}/tiers/${tier.id}`).set(auth).send({ quantity: 150 });
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(50);
  });

  it('locks the price once a ticket is sold', async () => {
    const { auth, event } = await ownerWithEvent({ status: 'published' });
    const tier = await createTier(event._id, { sold: 1 });
    const res = await request(app).patch(`${api}/tiers/${tier.id}`).set(auth).send({ price: 1000 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'TIER_PRICE_LOCKED', details: { sold: 1 } });
    expect((await request(app).patch(`${api}/tiers/${tier.id}`).set(auth).send({ price: 5000 })).status).toBe(200);
  });

  it('never drops the quantity below sold plus reserved', async () => {
    const { auth, event } = await ownerWithEvent({ status: 'published' });
    const tier = await createTier(event._id, { sold: 30, reserved: 5 });
    const res = await request(app).patch(`${api}/tiers/${tier.id}`).set(auth).send({ quantity: 34 });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'TIER_QUANTITY_BELOW_SOLD', details: { minimum: 35 } });
    expect(
      (await request(app).patch(`${api}/tiers/${tier.id}`).set(auth).send({ quantity: 35 })).body.data.available,
    ).toBe(0);
  });

  it('checks the quantity against sales made at the same moment (TKT-4)', async () => {
    const { auth, event } = await ownerWithEvent({ status: 'published' });
    const tier = await createTier(event._id, { quantity: 10, sold: 5 });
    const [shrink] = await Promise.all([
      request(app).patch(`${api}/tiers/${tier.id}`).set(auth).send({ quantity: 6 }),
      TicketTierModel.updateOne(
        { _id: tier._id, $expr: { $lte: [{ $add: ['$sold', '$reserved', 3] }, '$quantity'] } },
        { $inc: { reserved: 3 } },
      ),
    ]);
    const stored = (await TicketTierModel.findById(tier._id))!;
    expect(stored.sold + stored.reserved).toBeLessThanOrEqual(stored.quantity);
    expect([200, 409]).toContain(shrink.status);
  });

  it('keeps sales ending before the event starts', async () => {
    const { auth, event } = await ownerWithEvent();
    const tier = await createTier(event._id);
    const res = await request(app)
      .patch(`${api}/tiers/${tier.id}`)
      .set(auth)
      .send({ salesEndAt: daysFromNow(40).toISOString() });
    expect(res.body.error.code).toBe('SALES_END_AFTER_EVENT_START');
  });

  it.each(['cancelled', 'completed'])('refuses changes once the event is %s', async (status) => {
    const { auth, event } = await ownerWithEvent({
      status,
      ...(status === 'cancelled' && { cancellationReason: 'x' }),
    });
    const tier = await createTier(event._id);
    expect(
      (await request(app).patch(`${api}/tiers/${tier.id}`).set(auth).send({ quantity: 200 })).body.error.code,
    ).toBe('EVENT_NOT_EDITABLE');
  });

  it('only lets the owner change a tier', async () => {
    const { event } = await ownerWithEvent();
    const tier = await createTier(event._id);
    const other = await createUser('organizer');
    expect((await request(app).patch(`${api}/tiers/${tier.id}`).set(other.auth).send({ price: 1 })).status).toBe(403);
    expect((await request(app).patch(`${api}/tiers/${objectId()}`).set(other.auth).send({ price: 1 })).status).toBe(
      404,
    );
    expect((await request(app).patch(`${api}/tiers/${tier.id}`).set(other.auth).send({})).status).toBe(400);
  });
});

describe('DELETE /tiers/:id', () => {
  it('deletes a tier with no sales or reservations', async () => {
    const { auth, event } = await ownerWithEvent();
    const tier = await createTier(event._id);
    expect((await request(app).delete(`${api}/tiers/${tier.id}`).set(auth)).status).toBe(200);
    expect(await TicketTierModel.countDocuments()).toBe(0);
  });

  it.each([
    ['sold', { sold: 1 }],
    ['reserved', { reserved: 1 }],
  ])('keeps a tier with %s tickets', async (_label, counts) => {
    const { auth, event } = await ownerWithEvent({ status: 'published' });
    const tier = await createTier(event._id, counts);
    const res = await request(app).delete(`${api}/tiers/${tier.id}`).set(auth);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('TIER_IN_USE');
    expect(await TicketTierModel.countDocuments()).toBe(1);
  });
});
