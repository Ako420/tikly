import { Types } from 'mongoose';
import nodemailer from 'nodemailer';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { setMailTransport } from '../src/lib/mailer';
import { setPushSender, type PushMessage } from '../src/lib/push';
import { NotificationModel, TicketModel, UserModel } from '../src/model';
import { notifyUsers, sendEventReminders, settleNotifications } from '../src/service/notification.service';
import { createQrToken } from '../src/util/qrToken';
import { useTestDatabase } from './helpers/db';
import { createEvent, createTier, createUser, objectId } from './helpers/factories';

useTestDatabase('notifications');

const app = buildApp();
const api = '/api/v1';
const TOKEN = 'ExponentPushToken[device-1]';
const DEAD_TOKEN = 'ExponentPushToken[uninstalled]';

type Mail = { to: string; subject: string; html: string; text: string };
let mails: Mail[] = [];
let pushes: PushMessage[] = [];
let pushFails = false;
let mailFails = false;
let counter = 0;

beforeEach(() => {
  mails = [];
  pushes = [];
  pushFails = false;
  mailFails = false;
  setMailTransport(
    nodemailer.createTransport({
      name: 'capture',
      version: '1',
      send: (mail, done) => {
        if (mailFails) return done(new Error('SMTP down'), undefined as never);
        const data = mail.data as { to: string; subject: string; html: string; text: string };
        mails.push({ to: String(data.to), subject: data.subject, html: String(data.html), text: String(data.text) });
        done(null, { envelope: { from: '', to: [] }, messageId: `<m${mails.length}@tikly.test>` } as never);
      },
    }),
  );
  setPushSender({
    send: async (messages) => {
      if (pushFails) throw new Error('Expo down');
      pushes.push(...messages);
      const invalidTokens = messages.flatMap((message) => message.to).filter((token) => token === DEAD_TOKEN);
      return { sent: messages.length, invalidTokens };
    },
  });
});

async function member(
  language: 'en' | 'fr' = 'en',
  pushTokens = [TOKEN],
  role: 'organizer' | 'attendee' = 'organizer',
) {
  const account = await createUser(role, { language, name: 'Ama Ngono' });
  await UserModel.updateOne({ _id: account.user._id }, { pushTokens });
  return account;
}

async function channelsOf(userId: Types.ObjectId) {
  await settleNotifications();
  return (await NotificationModel.findOne({ userId }))!.channels;
}

describe('delivering notifications (NOT-1, NOT-4)', () => {
  it('sends a push and an email in the user’s language', async () => {
    const ama = await member('fr');
    await notifyUsers([ama.user.id], 'booking_accepted', { bookingId: 'b1', amount: 50000 });
    await settleNotifications();

    expect(pushes).toHaveLength(1);
    expect(pushes[0]).toMatchObject({
      to: [TOKEN],
      title: 'Réservation acceptée',
      body: 'Payez 50\u00a0000\u00a0XAF pour confirmer votre réservation.',
      data: { type: 'booking_accepted', bookingId: 'b1' },
    });
    expect(mails).toHaveLength(1);
    expect(mails[0]!.subject).toBe('Réservation acceptée');
    expect(mails[0]!.text).toContain('Bonjour Ama Ngono,');
    expect(mails[0]!.html).toContain('https://tikly.test/bookings/b1');
    expect(await channelsOf(ama.user._id)).toEqual(['push', 'email']);
  });

  it('uses the event title in the reader’s language', async () => {
    const ama = await member('fr');
    const event = await createEvent(objectId(), { status: 'published' });
    await notifyUsers([ama.user.id], 'event_cancelled', { reason: 'Pluie' }, event.id);
    await settleNotifications();
    expect(pushes[0]!.body).toBe('« Nuit du jazz de Douala » a été annulé. Motif : Pluie');
    expect(pushes[0]!.data).toMatchObject({ eventId: event.id });
  });

  it('leaves ticket emails to the order email with the PDF', async () => {
    const ama = await member();
    await notifyUsers([ama.user.id], 'ticket_purchased', { orderId: 'o1', tickets: 2 }, String(objectId()));
    await settleNotifications();
    expect(pushes[0]!.title).toBe('Your tickets are ready');
    expect(mails).toHaveLength(0);
    expect(await channelsOf(ama.user._id)).toEqual(['push']);
  });

  it('forgets uninstalled devices and skips inactive accounts', async () => {
    const ama = await member('en', [TOKEN, DEAD_TOKEN]);
    const gone = await member();
    await UserModel.updateOne({ _id: gone.user._id }, { status: 'suspended' });
    await notifyUsers([ama.user.id, gone.user.id], 'booking_paid', { bookingId: 'b1', amount: 1000 });
    await settleNotifications();

    expect((await UserModel.findById(ama.user._id))!.pushTokens).toEqual([TOKEN]);
    expect(pushes.flatMap((message) => message.to)).toEqual([TOKEN, DEAD_TOKEN]);
    expect(mails.map((mail) => mail.to)).toEqual([ama.user.email]);
    expect(await channelsOf(gone.user._id)).toEqual([]);
  });

  it('keeps the in-app copy when push or email fails', async () => {
    const ama = await member();
    pushFails = true;
    await notifyUsers([ama.user.id], 'booking_declined', { bookingId: 'b1' });
    await settleNotifications();
    expect(await channelsOf(ama.user._id)).toEqual(['email']);

    const bello = await member('en', []);
    mailFails = true;
    await notifyUsers([bello.user.id], 'booking_declined', { bookingId: 'b2' });
    await settleNotifications();
    expect(await channelsOf(bello.user._id)).toEqual([]);
    expect(await NotificationModel.countDocuments({ userId: bello.user._id })).toBe(1);
  });
});

describe('/me/notifications (5.13)', () => {
  it('lists mine newest first in my language with an unread count', async () => {
    const ama = await member('fr', []);
    await notifyUsers([ama.user.id], 'booking_requested', {
      bookingId: 'b1',
      service: 'Bâche',
      quantity: 2,
      startDate: '2026-12-19T08:00:00.000Z',
    });
    await notifyUsers([ama.user.id], 'booking_cancelled', { bookingId: 'b2', refunded: 50000 });
    await notifyUsers([(await member()).user.id], 'booking_paid', { amount: 1 });

    const res = await request(app).get(`${api}/me/notifications`).set(ama.auth);
    expect(res.status).toBe(200);
    expect(res.body.meta).toMatchObject({ total: 2, unread: 2 });
    expect(res.body.data[0]).toMatchObject({
      type: 'booking_cancelled',
      title: 'Réservation annulée',
      body: 'La réservation a été annulée avant l’arrivée de votre paiement. 50\u00a0000\u00a0XAF vous est renvoyé.',
      read: false,
      readAt: null,
      data: { bookingId: 'b2' },
    });
    expect(res.body.data[1].body).toMatch(/^2 × Bâche à partir du samedi 19 décembre 2026/);
  });

  it('marks one or all as read, only for their owner', async () => {
    const ama = await member('en', []);
    await notifyUsers([ama.user.id], 'booking_paid', { amount: 1000 });
    await notifyUsers([ama.user.id], 'booking_paid', { amount: 2000 });
    const [first] = (await request(app).get(`${api}/me/notifications`).set(ama.auth)).body.data;

    const stranger = await member();
    expect((await request(app).patch(`${api}/me/notifications/${first.id}/read`).set(stranger.auth)).status).toBe(404);

    const one = await request(app).patch(`${api}/me/notifications/${first.id}/read`).set(ama.auth);
    expect(one.body.data).toMatchObject({ id: first.id, read: true });
    expect((await request(app).get(`${api}/me/notifications`).set(ama.auth)).body.meta.unread).toBe(1);

    const all = await request(app).patch(`${api}/me/notifications/read-all`).set(ama.auth);
    expect(all.body.data).toEqual({ updated: 1 });
    expect((await request(app).get(`${api}/me/notifications`).set(ama.auth)).body.meta.unread).toBe(0);
    expect((await request(app).get(`${api}/me/notifications`)).status).toBe(401);
  });
});

describe('24-hour reminders (NOT-2, NOT-3)', () => {
  async function holderOf(eventId: Types.ObjectId, tierId: Types.ObjectId, userId: Types.ObjectId, status = 'valid') {
    const _id = new Types.ObjectId();
    counter += 1;
    await TicketModel.create({
      _id,
      code: `EVT-RMND-${String(counter).padStart(3, '0')}`,
      qrToken: createQrToken(String(_id)),
      orderId: objectId(),
      eventId,
      tierId,
      holderId: userId,
      status,
    });
  }

  it('reminds each ticket holder once, by push and email', async () => {
    const now = new Date();
    const soon = await createEvent(objectId(), {
      status: 'published',
      startAt: new Date(now.getTime() + 23.9 * 60 * 60 * 1000),
      endAt: new Date(now.getTime() + 26 * 60 * 60 * 1000),
    });
    const later = await createEvent(objectId(), { status: 'published' });
    const tier = await createTier(soon._id, { salesEndAt: new Date(now.getTime() + 60 * 60 * 1000) });
    const ama = await member('fr', [], 'attendee');
    const bello = await member('en', [TOKEN], 'attendee');
    const refunded = await member('en', [TOKEN], 'attendee');
    await holderOf(soon._id, tier._id, ama.user._id);
    await holderOf(soon._id, tier._id, ama.user._id);
    await holderOf(soon._id, tier._id, bello.user._id);
    await holderOf(soon._id, tier._id, refunded.user._id, 'refunded');
    await holderOf(later._id, tier._id, bello.user._id);

    expect(await sendEventReminders(now)).toBe(2);
    expect(await sendEventReminders(new Date(now.getTime() + 15 * 60 * 1000))).toBe(0);
    expect(await NotificationModel.countDocuments({ type: 'reminder_24h' })).toBe(2);

    const amaMail = mails.find((mail) => mail.to === ama.user.email)!;
    expect(amaMail.subject).toBe('Demain : Nuit du jazz de Douala');
    expect(amaMail.text).toContain('2 billets');
    expect(pushes).toHaveLength(1);
    expect(pushes[0]).toMatchObject({ to: [TOKEN], title: '“Douala Jazz Night” is tomorrow' });
  });
});
