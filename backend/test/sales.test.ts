import { Types } from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { OrderModel, TicketModel } from '../src/model';
import { createQrToken } from '../src/util/qrToken';
import { useTestDatabase } from './helpers/db';
import { createEvent, createTier, createUser } from './helpers/factories';

useTestDatabase('sales');

const app = buildApp();
const api = '/api/v1';
let counter = 0;

async function setup() {
  const organizer = await createUser('organizer');
  const event = await createEvent(organizer.user._id, { status: 'published' });
  const vip = await createTier(event._id, { name: 'vip', price: 10000, sold: 2 });
  const standard = await createTier(event._id, { price: 5000, sold: 1 });
  return { organizer, event, vip, standard };
}

async function purchase(
  eventId: Types.ObjectId,
  organizerId: Types.ObjectId,
  tierId: Types.ObjectId,
  quantity: number,
  name: string,
  status: 'paid' | 'pending' = 'paid',
) {
  const buyer = await createUser('attendee', { name });
  const order = await OrderModel.create({
    type: 'ticket',
    buyerId: buyer.user._id,
    payeeId: organizerId,
    eventId,
    items: [{ refId: tierId, refModel: 'TicketTier', quantity, unitPrice: 5000 }],
    amount: quantity * 5000,
    status,
    phone: '+237670000123',
    ...(status === 'pending' && { expiresAt: new Date(Date.now() + 600_000) }),
    ...(status === 'paid' && { paidAt: new Date() }),
  });
  const tickets = [];
  if (status === 'paid') {
    for (let i = 0; i < quantity; i += 1) {
      const _id = new Types.ObjectId();
      counter += 1;
      tickets.push(
        await TicketModel.create({
          _id,
          code: `EVT-SALE-${String(counter).padStart(3, '0')}`,
          qrToken: createQrToken(String(_id)),
          orderId: order._id,
          eventId,
          tierId,
          holderId: buyer.user._id,
        }),
      );
    }
  }
  return { buyer, order, tickets };
}

describe('GET /events/:eventId/orders', () => {
  it('lists the event ticket orders newest first with buyer and tier', async () => {
    const { organizer, event, vip, standard } = await setup();
    await purchase(event._id, organizer.user._id, vip._id, 2, 'Ama Ngono');
    await purchase(event._id, organizer.user._id, standard._id, 1, 'Paul Mbia', 'pending');

    const res = await request(app).get(`${api}/events/${event.id}/orders`).set(organizer.auth);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ total: 2 });
    expect(res.body.data[0]).toMatchObject({ buyer: { name: 'Paul Mbia' }, status: 'pending', tickets: 1 });
    expect(res.body.data[1]).toMatchObject({
      buyer: { name: 'Ama Ngono' },
      status: 'paid',
      amount: 10000,
      items: [{ tier: 'vip', quantity: 2 }],
    });
  });

  it('filters by status and searches by buyer name or ticket code', async () => {
    const { organizer, event, vip, standard } = await setup();
    const ama = await purchase(event._id, organizer.user._id, vip._id, 1, 'Ama Ngono');
    await purchase(event._id, organizer.user._id, standard._id, 1, 'Paul Mbia', 'pending');

    const paid = await request(app).get(`${api}/events/${event.id}/orders?status=paid`).set(organizer.auth);
    expect(paid.body.data).toHaveLength(1);

    const byName = await request(app).get(`${api}/events/${event.id}/orders?q=paul`).set(organizer.auth);
    expect(byName.body.data.map((o: { buyer: { name: string } }) => o.buyer.name)).toEqual(['Paul Mbia']);

    const byCode = await request(app)
      .get(`${api}/events/${event.id}/orders?q=${ama.tickets[0]!.code.toLowerCase()}`)
      .set(organizer.auth);
    expect(byCode.body.data.map((o: { id: string }) => o.id)).toEqual([ama.order.id]);
  });

  it('refuses another organizer and attendees', async () => {
    const { event } = await setup();
    const other = await createUser('organizer');
    const attendee = await createUser('attendee');
    expect((await request(app).get(`${api}/events/${event.id}/orders`).set(other.auth)).status).toBe(403);
    expect((await request(app).get(`${api}/events/${event.id}/orders`).set(attendee.auth)).status).toBe(403);
    expect((await request(app).get(`${api}/events/${event.id}/orders`)).status).toBe(401);
  });
});

describe('GET /events/:eventId/attendees', () => {
  it('lists tickets with holder, tier and check-in time, filterable by tier and status', async () => {
    const { organizer, event, vip, standard } = await setup();
    const ama = await purchase(event._id, organizer.user._id, vip._id, 2, 'Ama Ngono');
    await purchase(event._id, organizer.user._id, standard._id, 1, 'Paul Mbia');
    const at = new Date('2026-12-01T18:00:00Z');
    await TicketModel.updateOne(
      { _id: ama.tickets[0]!._id },
      { status: 'checked_in', checkIns: [{ at, staffId: organizer.user._id, type: 'entry' }] },
    );

    const all = await request(app).get(`${api}/events/${event.id}/attendees`).set(organizer.auth);
    expect(all.status).toBe(200);
    expect(all.body.meta).toMatchObject({ total: 3 });

    const vipOnly = await request(app).get(`${api}/events/${event.id}/attendees?tierId=${vip.id}`).set(organizer.auth);
    expect(vipOnly.body.data).toHaveLength(2);
    expect(vipOnly.body.data[0]).toMatchObject({ tier: 'vip', holder: { name: 'Ama Ngono' } });

    const inside = await request(app).get(`${api}/events/${event.id}/attendees?status=checked_in`).set(organizer.auth);
    expect(inside.body.data).toEqual([
      expect.objectContaining({ code: ama.tickets[0]!.code, checkedInAt: at.toISOString(), reentries: 0 }),
    ]);
  });
});
