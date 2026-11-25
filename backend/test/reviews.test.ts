import { Types } from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { buildApp } from '../src/app';
import { BookingModel, EventModel, ProviderModel, ReviewModel, ServiceModel, TicketModel } from '../src/model';
import { completeEndedEvents } from '../src/service/event.service';
import { refreshRating } from '../src/service/review.service';
import { createQrToken } from '../src/util/qrToken';
import { useTestDatabase } from './helpers/db';
import { createEvent, createTier, createUser, daysFromNow, objectId } from './helpers/factories';

useTestDatabase('reviews');

const app = buildApp();
const api = '/api/v1';
let counter = 0;

async function pastEvent(status = 'completed') {
  const organizer = await createUser('organizer');
  const event = await createEvent(organizer.user._id, {
    status,
    ...(status === 'cancelled' && { cancellationReason: 'Venue flooded.' }),
  });
  await EventModel.collection.updateOne(
    { _id: event._id },
    { $set: { startAt: daysFromNow(-2), endAt: daysFromNow(-1.9) } },
  );
  const tier = await createTier(event._id);
  return { organizer, event, tier };
}

async function attendee(eventId: Types.ObjectId, tierId: Types.ObjectId, scanned = true, name = 'Ama Ngono Biya') {
  const account = await createUser('attendee', { name });
  const _id = new Types.ObjectId();
  counter += 1;
  await TicketModel.create({
    _id,
    code: `EVT-REVW-${String(counter).padStart(3, '0')}`,
    qrToken: createQrToken(String(_id)),
    orderId: objectId(),
    eventId,
    tierId,
    holderId: account.user._id,
    ...(scanned && { status: 'checked_in', checkIns: [{ at: daysFromNow(-2), type: 'entry', staffId: objectId() }] }),
  });
  return account;
}

const review = (path: string, auth: Record<string, string>, body: Record<string, unknown>) =>
  request(app).post(`${api}${path}`).set(auth).send(body);

describe('event reviews (REV-1, REV-3)', () => {
  it('lets checked-in attendees review once and updates the rating', async () => {
    const { event, tier } = await pastEvent();
    const ama = await attendee(event._id, tier._id);
    const bello = await attendee(event._id, tier._id, true, 'Bello');

    const first = await review(`/events/${event.id}/reviews`, ama.auth, { rating: 5, comment: 'Great night!' });
    expect(first.status).toBe(201);
    expect(first.body.data).toMatchObject({ rating: 5, comment: 'Great night!', author: 'Ama B.' });
    await review(`/events/${event.id}/reviews`, bello.auth, { rating: 4 });

    const again = await review(`/events/${event.id}/reviews`, ama.auth, { rating: 1 });
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe('REVIEW_EXISTS');

    expect(await EventModel.findById(event._id)).toMatchObject({ ratingAvg: 4.5, ratingCount: 2 });
    const page = await request(app).get(`${api}/events/${event.id}`);
    expect(page.body.data).toMatchObject({ ratingAvg: 4.5, ratingCount: 2 });

    const list = await request(app).get(`${api}/events/${event.id}/reviews?limit=1`);
    expect(list.body.data).toEqual([expect.objectContaining({ rating: 4, author: 'Bello' })]);
    expect(list.body.meta).toEqual({ page: 1, limit: 1, total: 2, pages: 2 });
  });

  it('refuses people who did not attend and events still running', async () => {
    const { event, tier } = await pastEvent();
    const noShow = await attendee(event._id, tier._id, false);
    const stranger = await createUser('attendee');
    for (const auth of [noShow.auth, stranger.auth]) {
      const res = await review(`/events/${event.id}/reviews`, auth, { rating: 3 });
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('REVIEW_NOT_ALLOWED');
    }

    const organizer = await createUser('organizer');
    const upcoming = await createEvent(organizer.user._id, { status: 'published' });
    const early = await attendee(upcoming._id, tier._id);
    expect((await review(`/events/${upcoming.id}/reviews`, early.auth, { rating: 5 })).status).toBe(403);
    expect((await review(`/events/${objectId()}/reviews`, early.auth, { rating: 5 })).status).toBe(404);
    expect((await review(`/events/${event.id}/reviews`, organizer.auth, { rating: 5 })).status).toBe(403);
  });

  it('accepts a published event whose end has passed before the hourly job runs', async () => {
    const { event, tier } = await pastEvent('published');
    const ama = await attendee(event._id, tier._id);
    expect((await review(`/events/${event.id}/reviews`, ama.auth, { rating: 4 })).status).toBe(201);
  });

  it('validates the rating', async () => {
    const { event, tier } = await pastEvent();
    const ama = await attendee(event._id, tier._id);
    const res = await review(`/events/${event.id}/reviews`, ama.auth, { rating: 4.5, comment: 'x'.repeat(1001) });
    expect(res.status).toBe(400);
    expect(res.body.error.details.rating.message).toBe('The rating must be a whole number of stars.');
    expect(res.body.error.details.comment.message).toBe('The comment must be at most 1000 characters.');
    expect(
      (await review(`/events/${event.id}/reviews`, ama.auth, { rating: 6 })).body.error.details.rating.message,
    ).toBe('The rating must be between 1 and 5 stars.');
  });

  it('hides hidden reviews and recounts without them (REV-4)', async () => {
    const { event, tier } = await pastEvent();
    const ama = await attendee(event._id, tier._id);
    const bello = await attendee(event._id, tier._id);
    const bad = await review(`/events/${event.id}/reviews`, ama.auth, { rating: 1, comment: 'abuse' });
    await review(`/events/${event.id}/reviews`, bello.auth, { rating: 5 });

    await ReviewModel.updateOne({ _id: bad.body.data.id }, { hidden: true });
    expect(await refreshRating('event', event._id)).toEqual({ ratingAvg: 5, ratingCount: 1 });
    const list = await request(app).get(`${api}/events/${event.id}/reviews`);
    expect(list.body.data.map((item: { rating: number }) => item.rating)).toEqual([5]);
  });

  it('keeps reviews of unpublished events private', async () => {
    const organizer = await createUser('organizer');
    const draft = await createEvent(organizer.user._id);
    expect((await request(app).get(`${api}/events/${draft.id}/reviews`)).status).toBe(404);
  });
});

describe('provider reviews (REV-2)', () => {
  async function completedBooking() {
    const providerAccount = await createUser('provider');
    const provider = await ProviderModel.create({
      userId: providerAccount.user._id,
      businessName: 'Akwa Events Hire',
      city: 'Douala',
      country: 'Cameroon',
      phone: '+237677123456',
      documents: ['documents/niu'],
      verification: 'verified',
    });
    const service = await ServiceModel.create({
      providerId: provider._id,
      category: 'sound',
      title: { en: 'Sound system' },
      city: 'Douala',
      price: 80000,
      unit: 'per_event',
    });
    const organizer = await createUser('organizer', { name: 'Ama Ngono' });
    const booking = await BookingModel.create({
      serviceId: service._id,
      organizerId: organizer.user._id,
      startDate: daysFromNow(-3),
      endDate: daysFromNow(-2),
      quantity: 1,
      amount: 80000,
      status: 'completed',
    });
    return { provider, service, organizer, booking };
  }

  it('lets the organizer review a completed booking once', async () => {
    const { provider, organizer, booking } = await completedBooking();
    const path = `/providers/${provider.id}/reviews`;
    const before = await request(app).get(`${api}/bookings/${booking.id}`).set(organizer.auth);
    expect(before.body.data.review).toBeNull();
    const res = await review(path, organizer.auth, { rating: 4, comment: 'On time.', bookingId: booking.id });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ rating: 4, author: 'Ama N.' });
    expect((await review(path, organizer.auth, { rating: 5, bookingId: booking.id })).body.error.code).toBe(
      'REVIEW_EXISTS',
    );

    expect(await ProviderModel.findById(provider._id)).toMatchObject({ ratingAvg: 4, ratingCount: 1 });
    const after = await request(app).get(`${api}/bookings/${booking.id}`).set(organizer.auth);
    expect(after.body.data.review).toEqual({ id: res.body.data.id, rating: 4 });
    const publicPage = await request(app).get(`${api}/providers/${provider.id}`);
    expect(publicPage.body.data).toMatchObject({ ratingAvg: 4, ratingCount: 1 });
    const list = await request(app).get(`${api}/providers/${provider.id}/reviews`);
    expect(list.body.data).toEqual([expect.objectContaining({ rating: 4, comment: 'On time.' })]);
  });

  it('refuses bookings that are not completed, not mine or for another provider', async () => {
    const { provider, organizer, booking } = await completedBooking();
    const path = `/providers/${provider.id}/reviews`;
    await BookingModel.updateOne({ _id: booking._id }, { status: 'paid' });
    expect((await review(path, organizer.auth, { rating: 5, bookingId: booking.id })).body.error.code).toBe(
      'REVIEW_NOT_ALLOWED',
    );
    await BookingModel.updateOne({ _id: booking._id }, { status: 'completed' });

    const rival = await createUser('organizer');
    expect((await review(path, rival.auth, { rating: 5, bookingId: booking.id })).status).toBe(403);
    const other = await completedBooking();
    expect(
      (await review(`/providers/${other.provider.id}/reviews`, organizer.auth, { rating: 5, bookingId: booking.id }))
        .status,
    ).toBe(403);
    expect((await review(path, organizer.auth, { rating: 5 })).status).toBe(400);
    expect((await review(path, (await createUser('attendee')).auth, { rating: 5, bookingId: booking.id })).status).toBe(
      403,
    );
  });

  it('lists reviews of verified providers only', async () => {
    const { provider } = await completedBooking();
    await ProviderModel.updateOne({ _id: provider._id }, { verification: 'pending' });
    expect((await request(app).get(`${api}/providers/${provider.id}/reviews`)).status).toBe(404);
  });
});

describe('organizer reviews of their events (REV-3)', () => {
  async function reviewedEvent(organizerAuthor?: Awaited<ReturnType<typeof createUser>>, ratings: number[] = []) {
    const { organizer, event, tier } = await pastEvent();
    const owner = organizerAuthor ?? organizer;
    if (organizerAuthor) await EventModel.updateOne({ _id: event._id }, { organizerId: organizerAuthor.user._id });
    const reviews = [];
    for (const [index, rating] of ratings.entries()) {
      const author = await attendee(event._id, tier._id, true, `Guest ${index} Mbia`);
      reviews.push(await review(`/events/${event.id}/reviews`, author.auth, { rating, comment: `Rated ${rating}` }));
    }
    return { organizer: owner, event, reviews };
  }

  it('lists reviews across my events newest first, with the event, and filters by event and rating', async () => {
    const first = await reviewedEvent(undefined, [5, 3]);
    const second = await reviewedEvent(first.organizer, [4]);
    await reviewedEvent(undefined, [1]);

    const all = await request(app).get(`${api}/organizer/reviews`).set(first.organizer.auth);
    expect(all.status).toBe(200);
    expect(all.body.meta).toMatchObject({ total: 3 });
    expect(all.body.data[0]).toMatchObject({ rating: 4, comment: 'Rated 4', event: { id: second.event.id } });

    const one = await request(app).get(`${api}/organizer/reviews?eventId=${first.event.id}`).set(first.organizer.auth);
    expect(one.body.data.map((item: { rating: number }) => item.rating).sort()).toEqual([3, 5]);

    const fives = await request(app).get(`${api}/organizer/reviews?rating=5`).set(first.organizer.auth);
    expect(fives.body.data).toEqual([expect.objectContaining({ rating: 5, author: 'Guest M.' })]);
  });

  it('refuses events of other organizers, bad ratings and non-organizers', async () => {
    const mine = await reviewedEvent(undefined, [5]);
    const theirs = await reviewedEvent(undefined, [2]);
    const other = await request(app).get(`${api}/organizer/reviews?eventId=${theirs.event.id}`).set(mine.organizer.auth);
    expect(other.status).toBe(404);
    const bad = await request(app).get(`${api}/organizer/reviews?rating=6`).set(mine.organizer.auth);
    expect(bad.status).toBe(400);
    const guest = await createUser('attendee');
    expect((await request(app).get(`${api}/organizer/reviews`).set(guest.auth)).status).toBe(403);
    expect((await request(app).get(`${api}/organizer/reviews/summary`).set(guest.auth)).status).toBe(403);
  });

  it('summarises the average, the star breakdown and each event, leaving out hidden reviews', async () => {
    const first = await reviewedEvent(undefined, [5, 4, 2]);
    const second = await reviewedEvent(first.organizer, [5]);
    await ReviewModel.updateOne({ _id: first.reviews[2]!.body.data.id }, { hidden: true });

    const res = await request(app).get(`${api}/organizer/reviews/summary`).set(first.organizer.auth);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      average: 4.7,
      count: 3,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 2 },
    });
    expect(res.body.data.events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: first.event.id, ratingAvg: 4.5, ratingCount: 2 }),
        expect.objectContaining({ id: second.event.id, ratingAvg: 5, ratingCount: 1 }),
      ]),
    );

    const empty = await createUser('organizer');
    const none = await request(app).get(`${api}/organizer/reviews/summary`).set(empty.auth);
    expect(none.body.data).toEqual({ average: 0, count: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, events: [] });
  });
});

describe('complete-events job (EVT-9)', () => {
  it('marks published events that have ended as completed', async () => {
    const ended = await pastEvent('published');
    const organizer = await createUser('organizer');
    const upcoming = await createEvent(organizer.user._id, { status: 'published' });
    const cancelled = await pastEvent('cancelled');

    expect(await completeEndedEvents()).toBe(1);
    expect((await EventModel.findById(ended.event._id))!.status).toBe('completed');
    expect((await EventModel.findById(upcoming._id))!.status).toBe('published');
    expect((await EventModel.findById(cancelled.event._id))!.status).toBe('cancelled');
  });
});
