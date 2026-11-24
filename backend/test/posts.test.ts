import { Types } from 'mongoose';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { setPushSender, type PushMessage } from '../src/lib/push';
import { NotificationModel, PostModel, TicketModel, UserModel } from '../src/model';
import { settleNotifications } from '../src/service/notification.service';
import { createQrToken } from '../src/util/qrToken';
import { useTestDatabase } from './helpers/db';
import { createEvent, createUser, objectId } from './helpers/factories';

useTestDatabase('posts');

const app = buildApp();
const api = '/api/v1';
let counter = 0;
let pushes: PushMessage[] = [];

beforeEach(() => {
  pushes = [];
  setPushSender({
    send: async (messages) => {
      pushes.push(...messages);
      return { sent: messages.length, invalidTokens: [] };
    },
  });
});

const update = (overrides: Record<string, unknown> = {}) => ({
  type: 'update',
  title: { en: 'Doors open at 6 pm', fr: 'Ouverture des portes à 18 h' },
  body: { en: 'Come early for the opening act.', fr: 'Venez tôt pour la première partie.' },
  ...overrides,
});

async function myEvent(status = 'published') {
  const organizer = await createUser('organizer');
  const event = await createEvent(organizer.user._id, { status });
  return { organizer, event };
}

async function holder(eventId: Types.ObjectId, status = 'valid', language: 'en' | 'fr' = 'en') {
  const account = await createUser('attendee', { language });
  await UserModel.updateOne({ _id: account.user._id }, { pushTokens: ['ExponentPushToken[holder]'] });
  const _id = new Types.ObjectId();
  counter += 1;
  await TicketModel.create({
    _id,
    code: `EVT-POST-${String(counter).padStart(3, '0')}`,
    qrToken: createQrToken(String(_id)),
    orderId: objectId(),
    eventId,
    tierId: objectId(),
    holderId: account.user._id,
    status,
  });
  return account;
}

const post = (eventId: string, auth: Record<string, string>, body: Record<string, unknown>) =>
  request(app).post(`${api}/events/${eventId}/posts`).set(auth).send(body);

describe('POST /events/:eventId/posts', () => {
  it('lets the organizer post updates, speakers and promotions', async () => {
    const { organizer, event } = await myEvent();
    const res = await post(event.id, organizer.auth, update());
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      type: 'update',
      title: { en: 'Doors open at 6 pm' },
      pinned: false,
      images: [],
      notified: 0,
      authorId: organizer.user.id,
    });

    const speaker = await post(
      event.id,
      organizer.auth,
      update({
        type: 'speaker',
        title: { en: 'Meet our headliner' },
        speaker: { name: 'Charlotte Dipanda', role: 'Singer' },
        images: ['https://res.cloudinary.com/demo/image/upload/events/cd.jpg'],
        pinned: true,
      }),
    );
    expect(speaker.body.data.speaker).toEqual({ name: 'Charlotte Dipanda', role: 'Singer' });
    expect((await post(event.id, organizer.auth, update({ type: 'promo' }))).status).toBe(201);
  });

  it('validates posts', async () => {
    const { organizer, event } = await myEvent();
    const res = await post(event.id, organizer.auth, {
      type: 'speaker',
      title: {},
      body: { en: 'x'.repeat(5001) },
      images: ['not a url'],
    });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toMatchObject({
      title: { message: 'Give the post a title in English or French.' },
      'body.en': { message: 'The post must be at most 5000 characters.' },
      'images.0': { message: 'Each image must be a valid web address.' },
    });
    const noSpeaker = await post(event.id, organizer.auth, update({ type: 'speaker' }));
    expect(noSpeaker.body.error.details.speaker.message).toBe('A speaker post needs the speaker’s name.');
    expect((await post(event.id, organizer.auth, update({ type: 'gossip' }))).status).toBe(400);
  });

  it('is only for the event’s organizer', async () => {
    const { event } = await myEvent();
    expect((await post(event.id, (await createUser('organizer')).auth, update())).status).toBe(403);
    expect((await post(event.id, (await createUser('attendee')).auth, update())).status).toBe(403);
    expect((await request(app).post(`${api}/events/${event.id}/posts`).send(update())).status).toBe(401);
  });

  it('notifies ticket holders in their language when asked', async () => {
    const { organizer, event } = await myEvent();
    await holder(event._id, 'valid', 'fr');
    await holder(event._id, 'checked_in');
    await holder(event._id, 'refunded');

    const res = await post(event.id, organizer.auth, update({ notify: true }));
    expect(res.body.data.notified).toBe(2);
    expect(res.body.data.notifiedAt).toBeDefined();
    await settleNotifications();

    expect(await NotificationModel.countDocuments({ type: 'event_post', eventId: event._id })).toBe(2);
    const french = pushes.find((message) => message.title.startsWith('Du nouveau'));
    expect(french).toMatchObject({
      title: 'Du nouveau pour « Nuit du jazz de Douala »',
      body: 'Ouverture des portes à 18 h',
      data: { type: 'event_post', postId: res.body.data.id, eventId: event.id },
    });
    expect(pushes.find((message) => message.title.startsWith('News'))!.body).toBe('Doors open at 6 pm');
  });

  it('limits notifications to published events and 3 a day', async () => {
    const draft = await myEvent('draft');
    const early = await post(draft.event.id, draft.organizer.auth, update({ notify: true }));
    expect(early.body.error.code).toBe('POST_NOTIFY_NOT_PUBLISHED');
    expect((await post(draft.event.id, draft.organizer.auth, update())).status).toBe(201);

    const { organizer, event } = await myEvent();
    for (let i = 0; i < 3; i += 1) {
      expect((await post(event.id, organizer.auth, update({ notify: true }))).status).toBe(201);
    }
    const fourth = await post(event.id, organizer.auth, update({ notify: true }));
    expect(fourth.status).toBe(429);
    expect(fourth.body.error.code).toBe('POST_NOTIFY_LIMIT');
    expect((await post(event.id, organizer.auth, update())).status).toBe(201);
    await settleNotifications();
  });

  it('refuses posts on suspended events', async () => {
    const { organizer, event } = await myEvent('suspended');
    expect((await post(event.id, organizer.auth, update())).body.error.code).toBe('EVENT_NOT_EDITABLE');
  });
});

describe('GET /events/:eventId/posts', () => {
  it('lists pinned posts first, then newest, with a type filter', async () => {
    const { organizer, event } = await myEvent();
    const first = await post(event.id, organizer.auth, update());
    const pinned = await post(event.id, organizer.auth, update({ type: 'promo', pinned: true }));
    const latest = await post(event.id, organizer.auth, update());

    const res = await request(app).get(`${api}/events/${event.id}/posts`);
    expect(res.status).toBe(200);
    expect(res.body.data.map((item: { id: string }) => item.id)).toEqual([
      pinned.body.data.id,
      latest.body.data.id,
      first.body.data.id,
    ]);
    const promos = await request(app).get(`${api}/events/${event.id}/posts?type=promo&limit=1`);
    expect(promos.body.meta).toEqual({ page: 1, limit: 1, total: 1, pages: 1 });
  });

  it('keeps posts of unpublished events private to the owner', async () => {
    const { organizer, event } = await myEvent('draft');
    await post(event.id, organizer.auth, update());
    expect((await request(app).get(`${api}/events/${event.id}/posts`)).status).toBe(404);
    expect((await request(app).get(`${api}/events/${event.id}/posts`).set(organizer.auth)).body.meta.total).toBe(1);
  });
});

describe('PATCH and DELETE /posts/:id', () => {
  it('lets the owner edit and delete without notifying again', async () => {
    const { organizer, event } = await myEvent();
    await holder(event._id);
    const created = await post(
      event.id,
      organizer.auth,
      update({ type: 'speaker', speaker: { name: 'Charlotte Dipanda' }, notify: true }),
    );
    await settleNotifications();
    const id = created.body.data.id;

    const edited = await request(app)
      .patch(`${api}/posts/${id}`)
      .set(organizer.auth)
      .send({ type: 'update', speaker: null, pinned: true, title: { fr: 'Changement d’horaire' } });
    expect(edited.status).toBe(200);
    expect(edited.body.data).toMatchObject({ type: 'update', pinned: true, title: { fr: 'Changement d’horaire' } });
    expect(edited.body.data.speaker).toBeUndefined();
    expect(edited.body.data.title.en).toBeUndefined();
    expect(await NotificationModel.countDocuments({ type: 'event_post' })).toBe(1);

    const toSpeaker = await request(app).patch(`${api}/posts/${id}`).set(organizer.auth).send({ type: 'speaker' });
    expect(toSpeaker.status).toBe(400);
    expect(toSpeaker.body.error.details.speaker.message).toBe('A speaker post needs the speaker’s name.');

    expect((await request(app).delete(`${api}/posts/${id}`).set(organizer.auth)).status).toBe(200);
    expect(await PostModel.countDocuments()).toBe(0);
    expect((await request(app).delete(`${api}/posts/${id}`).set(organizer.auth)).status).toBe(404);
  });

  it('refuses other organizers and lets admins moderate', async () => {
    const { organizer, event } = await myEvent();
    const { body } = await post(event.id, organizer.auth, update());
    const rival = await createUser('organizer');
    expect(
      (await request(app).patch(`${api}/posts/${body.data.id}`).set(rival.auth).send({ pinned: true })).status,
    ).toBe(403);
    expect((await request(app).delete(`${api}/posts/${body.data.id}`).set(rival.auth)).status).toBe(403);
    const admin = await createUser('admin');
    expect((await request(app).delete(`${api}/posts/${body.data.id}`).set(admin.auth)).status).toBe(200);
  });
});
