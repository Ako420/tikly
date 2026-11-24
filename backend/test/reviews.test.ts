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
    const res = await review(path, organizer.auth, { rating: 4, comment: 'On time.', bookingId: booking.id });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ rating: 4, author: 'Ama N.' });
    expect((await review(path, organizer.auth, { rating: 5, bookingId: booking.id })).body.error.code).toBe(
      'REVIEW_EXISTS',
    );

    expect(await ProviderModel.findById(provider._id)).toMatchObject({ ratingAvg: 4, ratingCount: 1 });
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
