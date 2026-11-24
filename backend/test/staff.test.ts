import type { RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/middleware/rateLimit', () => {
  const pass: RequestHandler = (_req, _res, next) => next();
  return { authLimiter: pass, paymentLimiter: pass };
});

import { buildApp } from '../src/app';
import { EventModel, StaffAssignmentModel, TicketModel, UserModel } from '../src/model';
import { useTestDatabase } from './helpers/db';
import { createEvent, createTier, createUser, daysFromNow, objectId } from './helpers/factories';

useTestDatabase('staff');

const app = buildApp();
const api = '/api/v1';
const PASSWORD = 'gate-pass-2026';

async function organizerWithStaff(name = 'Gate 1', phone = '690000001') {
  const organizer = await createUser('organizer');
  const res = await request(app)
    .post(`${api}/organizer/staff`)
    .set(organizer.auth)
    .send({ name, phone, password: PASSWORD });
  return { organizer, staff: res.body.data as { id: string; phone: string } };
}

const login = (identifier: string, password = PASSWORD) =>
  request(app).post(`${api}/auth/login`).send({ identifier, password });

describe('organizer staff accounts (ACC-1)', () => {
  it('creates a staff account tied to the organizer that can log in by phone', async () => {
    const organizer = await createUser('organizer');
    const res = await request(app)
      .post(`${api}/organizer/staff`)
      .set(organizer.auth)
      .send({ name: 'Gate 1', phone: '690 00 00 01', password: PASSWORD, role: 'admin' });

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      name: 'Gate 1',
      phone: '+237690000001',
      role: 'staff',
      organizerId: organizer.user.id,
      events: [],
    });
    expect(res.body.data.email).toBeUndefined();
    const session = await login('690000001');
    expect(session.status).toBe(200);
    expect(session.body.data.user.role).toBe('staff');
  });

  it('refuses a phone already in use and non-organizers', async () => {
    await organizerWithStaff('Gate 1', '690000001');
    const organizer = await createUser('organizer');
    const taken = await request(app)
      .post(`${api}/organizer/staff`)
      .set(organizer.auth)
      .send({ name: 'Gate 2', phone: '690000001', password: PASSWORD });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe('PHONE_TAKEN');
    const attendee = await createUser('attendee');
    expect((await request(app).post(`${api}/organizer/staff`).set(attendee.auth).send({})).status).toBe(403);
  });

  it('lists only my staff, with the events they work', async () => {
    const { organizer, staff } = await organizerWithStaff();
    await organizerWithStaff('Other gate', '690000009');
    const event = await createEvent(organizer.user._id, { status: 'published' });
    await StaffAssignmentModel.create({ staffId: staff.id, eventId: event._id });

    const res = await request(app).get(`${api}/organizer/staff`).set(organizer.auth);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ id: staff.id, events: [{ id: event.id, status: 'published' }] });
  });

  it('resets a password and signs the staff member out', async () => {
    const { organizer, staff } = await organizerWithStaff();
    const { tokens } = (await login('690000001')).body.data;
    const res = await request(app)
      .patch(`${api}/organizer/staff/${staff.id}`)
      .set(organizer.auth)
      .send({ password: 'new-gate-pass' });
    expect(res.status).toBe(200);
    expect((await login('690000001')).status).toBe(401);
    expect((await login('690000001', 'new-gate-pass')).status).toBe(200);
    expect((await request(app).post(`${api}/auth/refresh`).send({ refreshToken: tokens.refreshToken })).status).toBe(
      401,
    );
  });

  it('disables and re-enables staff, and soft-deletes them', async () => {
    const { organizer, staff } = await organizerWithStaff();
    const { tokens } = (await login('690000001')).body.data;
    await request(app).patch(`${api}/organizer/staff/${staff.id}`).set(organizer.auth).send({ status: 'disabled' });
    expect((await login('690000001')).body.error.code).toBe('ACCOUNT_DISABLED');
    expect(
      (
        await request(app)
          .get(`${api}/staff/events`)
          .set({ Authorization: `Bearer ${tokens.accessToken}` })
      ).body.error.code,
    ).toBe('ACCOUNT_DISABLED');

    await request(app)
      .patch(`${api}/organizer/staff/${staff.id}`)
      .set(organizer.auth)
      .send({ status: 'active', name: 'Main gate' });
    expect((await login('690000001')).status).toBe(200);

    expect((await request(app).delete(`${api}/organizer/staff/${staff.id}`).set(organizer.auth)).status).toBe(200);
    expect((await UserModel.findById(staff.id))!.status).toBe('disabled');
  });

  it('hides other organizers’ staff', async () => {
    const { staff } = await organizerWithStaff();
    const other = await createUser('organizer');
    expect(
      (await request(app).patch(`${api}/organizer/staff/${staff.id}`).set(other.auth).send({ name: 'Mine now' }))
        .status,
    ).toBe(404);
    expect((await request(app).delete(`${api}/organizer/staff/${staff.id}`).set(other.auth)).status).toBe(404);
    const plainUser = await createUser('attendee');
    expect(
      (
        await request(app)
          .patch(`${api}/organizer/staff/${plainUser.user.id}`)
          .set(other.auth)
          .send({ name: 'Taken over' })
      ).status,
    ).toBe(404);
  });
});

describe('assigning staff to events', () => {
  it('assigns my staff to my event once, and unassigns them', async () => {
    const { organizer, staff } = await organizerWithStaff();
    const event = await createEvent(organizer.user._id);
    const assign = () =>
      request(app).post(`${api}/events/${event.id}/staff`).set(organizer.auth).send({ staffId: staff.id });

    const first = await assign();
    expect(first.status).toBe(201);
    expect(first.body.data).toEqual({ staffId: staff.id, eventId: event.id });
    const again = await assign();
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('STAFF_ALREADY_ASSIGNED');

    expect((await request(app).delete(`${api}/events/${event.id}/staff/${staff.id}`).set(organizer.auth)).status).toBe(
      200,
    );
    expect((await request(app).delete(`${api}/events/${event.id}/staff/${staff.id}`).set(organizer.auth)).status).toBe(
      404,
    );
  });

  it('refuses someone else’s staff or someone else’s event', async () => {
    const mine = await organizerWithStaff('Gate 1', '690000001');
    const theirs = await organizerWithStaff('Gate 2', '690000002');
    const myEvent = await createEvent(mine.organizer.user._id);
    const theirEvent = await createEvent(theirs.organizer.user._id);

    expect(
      (
        await request(app)
          .post(`${api}/events/${myEvent.id}/staff`)
          .set(mine.organizer.auth)
          .send({ staffId: theirs.staff.id })
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post(`${api}/events/${theirEvent.id}/staff`)
          .set(mine.organizer.auth)
          .send({ staffId: mine.staff.id })
      ).status,
    ).toBe(403);
  });
});

describe('GET /staff/events (ACC-2)', () => {
  it('shows only assigned published events, today’s first', async () => {
    const { organizer, staff } = await organizerWithStaff();
    const token = (await login('690000001')).body.data.tokens.accessToken;
    const later = await createEvent(organizer.user._id, {
      status: 'published',
      startAt: daysFromNow(10),
      endAt: daysFromNow(10.2),
    });
    const today = await createEvent(organizer.user._id, {
      status: 'published',
      startAt: daysFromNow(0.1),
      endAt: daysFromNow(0.3),
    });
    const draft = await createEvent(organizer.user._id);
    const old = await createEvent(organizer.user._id, { status: 'published' });
    await EventModel.collection.updateOne(
      { _id: old._id },
      { $set: { startAt: daysFromNow(-5), endAt: daysFromNow(-4.8) } },
    );
    const unassigned = await createEvent(organizer.user._id, { status: 'published' });
    for (const event of [later, today, draft, old])
      await StaffAssignmentModel.create({ staffId: staff.id, eventId: event._id });

    const res = await request(app)
      .get(`${api}/staff/events`)
      .set({ Authorization: `Bearer ${token}` });
    expect(res.status).toBe(200);
    expect(res.body.data.map((event: { id: string }) => event.id)).toEqual([today.id, later.id]);
    expect(res.body.data.map((event: { today: boolean }) => event.today)).toEqual([true, false]);
    expect(unassigned.id).toBeDefined();
  });

  it('reports tickets issued, checked in and scanned by this staff member', async () => {
    const { organizer, staff } = await organizerWithStaff();
    const token = (await login('690000001')).body.data.tokens.accessToken;
    const event = await createEvent(organizer.user._id, {
      status: 'published',
      startAt: daysFromNow(0.1),
      endAt: daysFromNow(0.3),
    });
    const tier = await createTier(event._id);
    await StaffAssignmentModel.create({ staffId: staff.id, eventId: event._id });
    const ticket = (status: string, staffId?: string) => ({
      code: `EVT-${Math.random().toString(36).slice(2, 6).toUpperCase()}-ABC`,
      qrToken: 'token',
      orderId: objectId(),
      eventId: event._id,
      tierId: tier._id,
      holderId: objectId(),
      status,
      checkIns: staffId ? [{ staffId, type: 'entry' }] : [],
    });
    await TicketModel.insertMany([
      ticket('valid'),
      ticket('valid'),
      ticket('checked_in', staff.id),
      ticket('checked_in', String(objectId())),
      ticket('refunded'),
    ]);

    const res = await request(app)
      .get(`${api}/staff/events`)
      .set({ Authorization: `Bearer ${token}` });
    expect(res.body.data[0]).toMatchObject({ id: event.id, capacity: 4, checkedIn: 2, scannedByMe: 1 });
  });

  it('is for staff only', async () => {
    const organizer = await createUser('organizer');
    expect((await request(app).get(`${api}/staff/events`).set(organizer.auth)).status).toBe(403);
  });
});
