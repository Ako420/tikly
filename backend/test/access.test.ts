import { Types } from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { OrderModel, StaffAssignmentModel, TicketModel } from '../src/model';
import { shortName } from '../src/service/access.service';
import { createQrToken } from '../src/util/qrToken';
import { useTestDatabase } from './helpers/db';
import { createEvent, createTier, createUser, objectId } from './helpers/factories';

useTestDatabase('access');

const app = buildApp();
const api = '/api/v1';
let counter = 0;

async function gate() {
  const organizer = await createUser('organizer');
  const staff = await createUser('staff', { organizerId: organizer.user._id, name: 'Gate 1' });
  const event = await createEvent(organizer.user._id, { status: 'published' });
  const vip = await createTier(event._id, { name: 'vip', sold: 3 });
  const standard = await createTier(event._id, { sold: 2 });
  await StaffAssignmentModel.create({ staffId: staff.user._id, eventId: event._id });
  return { organizer, staff, event, vip, standard };
}

async function ticket(eventId: Types.ObjectId, tierId: Types.ObjectId, overrides: Record<string, unknown> = {}) {
  const holder = await createUser('attendee', { name: 'Ama Ngono Biya' });
  const _id = new Types.ObjectId();
  counter += 1;
  return TicketModel.create({
    _id,
    code: `EVT-GATE-${String(counter).padStart(3, '0')}`,
    qrToken: createQrToken(String(_id)),
    orderId: objectId(),
    eventId,
    tierId,
    holderId: holder.user._id,
    ...overrides,
  });
}

const scan = (auth: Record<string, string>, body: Record<string, unknown>) =>
  request(app).post(`${api}/access/scan`).set(auth).send(body);

describe('POST /access/scan (ACC-3)', () => {
  it('admits a valid ticket once, then reports when it came in', async () => {
    const { staff, event, vip } = await gate();
    const t = await ticket(event._id, vip._id);

    const first = await scan(staff.auth, { eventId: event.id, qrToken: t.qrToken });
    expect(first.status).toBe(200);
    expect(first.body.data).toMatchObject({
      result: 'VALID',
      ticket: {
        code: t.code,
        tier: 'vip',
        holderName: 'Ama B.',
        status: 'checked_in',
        checkIns: [{ type: 'entry', staffName: 'Gate 1' }],
      },
    });

    const second = await scan(staff.auth, { eventId: event.id, qrToken: t.qrToken });
    expect(second.body.data.result).toBe('ALREADY_CHECKED_IN');
    expect(second.body.data.ticket.checkIns[0].at).toBe(first.body.data.ticket.checkIns[0].at);
  });

  it('lets exactly one of two gates admit the same ticket', async () => {
    const { staff, organizer, event, vip } = await gate();
    const t = await ticket(event._id, vip._id);
    const results = await Promise.all([
      scan(staff.auth, { eventId: event.id, qrToken: t.qrToken }),
      scan(organizer.auth, { eventId: event.id, qrToken: t.qrToken }),
    ]);
    expect(results.map((res) => res.body.data.result).sort()).toEqual(['ALREADY_CHECKED_IN', 'VALID']);
    expect((await TicketModel.findById(t._id))!.checkIns).toHaveLength(1);
  });

  it('rejects forged, foreign and cancelled tickets (SEC-2)', async () => {
    const { staff, event, vip } = await gate();
    const t = await ticket(event._id, vip._id);
    const forged = `${t.id}.AAAAAAAAAAAAAAAAAAAAAA`;
    expect((await scan(staff.auth, { eventId: event.id, qrToken: forged })).body.data).toEqual({ result: 'INVALID' });
    expect((await scan(staff.auth, { eventId: event.id, qrToken: 'garbage' })).body.data.result).toBe('INVALID');
    expect(
      (await scan(staff.auth, { eventId: event.id, qrToken: createQrToken(String(objectId())) })).body.data.result,
    ).toBe('INVALID');

    const otherEvent = await createEvent(objectId(), { status: 'published' });
    const foreign = await ticket(otherEvent._id, vip._id);
    expect((await scan(staff.auth, { eventId: event.id, qrToken: foreign.qrToken })).body.data).toEqual({
      result: 'WRONG_EVENT',
    });

    const refunded = await ticket(event._id, vip._id, { status: 'refunded' });
    expect((await scan(staff.auth, { eventId: event.id, qrToken: refunded.qrToken })).body.data.result).toBe(
      'CANCELLED',
    );
  });

  it('admits by the printed code when the QR will not scan (ACC-5)', async () => {
    const { staff, event, vip } = await gate();
    const t = await ticket(event._id, vip._id);
    expect((await scan(staff.auth, { eventId: event.id, code: t.code.toLowerCase() })).body.data.result).toBe('VALID');
    expect((await scan(staff.auth, { eventId: event.id, code: 'EVT-NOPE-999' })).body.data.result).toBe('INVALID');
    const empty = await scan(staff.auth, { eventId: event.id });
    expect(empty.status).toBe(400);
    expect(empty.body.error.details._.message).toBe('Send the scanned QR code or the ticket code.');
  });

  it('only lets assigned staff and the owner scan', async () => {
    const { organizer, event, vip } = await gate();
    const t = await ticket(event._id, vip._id);
    const idle = await createUser('staff', { organizerId: organizer.user._id });
    const rival = await createUser('organizer');

    for (const auth of [idle.auth, rival.auth]) {
      const res = await scan(auth, { eventId: event.id, qrToken: t.qrToken });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_ASSIGNED_TO_EVENT');
    }
    expect((await scan((await createUser('attendee')).auth, { eventId: event.id, qrToken: t.qrToken })).status).toBe(
      403,
    );
    expect((await scan(organizer.auth, { eventId: event.id, qrToken: t.qrToken })).body.data.result).toBe('VALID');
  });
});

describe('POST /access/tickets/:id/reentry (ACC-4)', () => {
  it('records a re-entry with a note after the first entry', async () => {
    const { staff, event, vip } = await gate();
    const t = await ticket(event._id, vip._id);
    const reenter = () =>
      request(app)
        .post(`${api}/access/tickets/${t.id}/reentry`)
        .set(staff.auth)
        .send({ eventId: event.id, note: 'Went to the car' });

    const early = await reenter();
    expect(early.status).toBe(409);
    expect(early.body.error.code).toBe('TICKET_NOT_CHECKED_IN');

    await scan(staff.auth, { eventId: event.id, qrToken: t.qrToken });
    const res = await reenter();
    expect(res.status).toBe(200);
    expect(res.body.data.checkIns.map((c: { type: string }) => c.type)).toEqual(['entry', 'reentry']);
    expect(res.body.data.checkIns[1]).toMatchObject({ note: 'Went to the car', staffName: 'Gate 1' });
  });

  it('refuses cancelled tickets and tickets from other events', async () => {
    const { staff, event, vip } = await gate();
    const refunded = await ticket(event._id, vip._id, { status: 'refunded' });
    const res = await request(app)
      .post(`${api}/access/tickets/${refunded.id}/reentry`)
      .set(staff.auth)
      .send({ eventId: event.id });
    expect(res.body.error.code).toBe('TICKET_NOT_VALID');

    const foreign = await ticket((await createEvent(objectId()))._id, vip._id, { status: 'checked_in' });
    expect(
      (
        await request(app)
          .post(`${api}/access/tickets/${foreign.id}/reentry`)
          .set(staff.auth)
          .send({ eventId: event.id })
      ).status,
    ).toBe(404);
  });
});

describe('GET /access/lookup (ACC-5)', () => {
  it('finds tickets by code, holder phone or paying phone', async () => {
    const { staff, event, vip, standard } = await gate();
    const t = await ticket(event._id, vip._id);
    const holder = await createUser('attendee', { name: 'Bello' });
    const second = await ticket(event._id, standard._id, { holderId: holder.user._id });
    const order = await OrderModel.create({
      type: 'ticket',
      buyerId: objectId(),
      payeeId: objectId(),
      eventId: event._id,
      items: [{ refId: vip._id, refModel: 'TicketTier', quantity: 1, unitPrice: 5000 }],
      amount: 5000,
      phone: '+237677999999',
      status: 'paid',
    });
    const paidByPhone = await ticket(event._id, vip._id, { orderId: order._id });
    const find = async (query: string) =>
      (await request(app).get(`${api}/access/lookup?eventId=${event.id}&${query}`).set(staff.auth)).body.data.map(
        (found: { code: string }) => found.code,
      );

    expect(await find(`code=${t.code.toLowerCase()}`)).toEqual([t.code]);
    expect(await find(`phone=${encodeURIComponent(holder.user.phone)}`)).toEqual([second.code]);
    expect(await find('phone=677999999')).toEqual([paidByPhone.code]);
    expect(await find('phone=670000123')).toEqual([]);
    const none = await request(app).get(`${api}/access/lookup?eventId=${event.id}`).set(staff.auth);
    expect(none.body.error.details._.message).toBe('Enter a ticket code or a phone number.');
  });
});

describe('GET /events/:eventId/checkins (ACC-6)', () => {
  it('counts check-ins and re-entries per tier', async () => {
    const { organizer, staff, event, vip, standard } = await gate();
    const a = await ticket(event._id, vip._id);
    const b = await ticket(event._id, vip._id);
    await ticket(event._id, standard._id);
    await scan(staff.auth, { eventId: event.id, qrToken: a.qrToken });
    await scan(staff.auth, { eventId: event.id, qrToken: b.qrToken });
    await request(app).post(`${api}/access/tickets/${a.id}/reentry`).set(staff.auth).send({ eventId: event.id });

    const res = await request(app).get(`${api}/events/${event.id}/checkins`).set(organizer.auth);
    expect(res.status).toBe(200);
    expect(res.body.data.tiers).toEqual([
      { id: standard.id, name: 'standard', sold: 2, checkedIn: 0, reentries: 0 },
      { id: vip.id, name: 'vip', sold: 3, checkedIn: 2, reentries: 1 },
    ]);
    expect(res.body.data.totals).toEqual({ sold: 5, checkedIn: 2, reentries: 1 });
    expect(res.body.data.lastCheckInAt).not.toBeNull();
  });

  it('is for the owner and admins', async () => {
    const { event, staff } = await gate();
    expect(
      (
        await request(app)
          .get(`${api}/events/${event.id}/checkins`)
          .set((await createUser('organizer')).auth)
      ).status,
    ).toBe(403);
    expect((await request(app).get(`${api}/events/${event.id}/checkins`).set(staff.auth)).status).toBe(403);
    expect(
      (
        await request(app)
          .get(`${api}/events/${event.id}/checkins`)
          .set((await createUser('admin')).auth)
      ).status,
    ).toBe(200);
  });
});

describe('holder names at the gate', () => {
  it('shows only a first name and initial', () => {
    expect(shortName('Ama Ngono Biya')).toBe('Ama B.');
    expect(shortName('  ama  ngono ')).toBe('ama N.');
    expect(shortName('Bello')).toBe('Bello');
  });
});
