import { Types } from 'mongoose';
import { BookingModel, EventModel, ProviderModel, ReviewModel, ServiceModel, TicketModel, UserModel } from '../model';
import type { EventReviewBody, OrganizerReviewsQuery, ProviderReviewBody } from '../schema/review.schema';
import type { EventStatus, ReviewTarget } from '../types/enums';
import { AppError } from '../util/AppError';
import type { Page } from '../util/pagination';
import { skipFor } from '../util/pagination';
import { shortName } from './access.service';

const PUBLIC_STATUSES: EventStatus[] = ['published', 'completed'];

const isDuplicateKey = (err: unknown) => (err as { code?: number }).code === 11000;

async function saveReview(review: Record<string, unknown>) {
  try {
    return await ReviewModel.create(review);
  } catch (err) {
    if (isDuplicateKey(err)) throw AppError.conflict('REVIEW_EXISTS');
    throw err;
  }
}

export async function refreshRating(target: ReviewTarget, targetId: Types.ObjectId | string) {
  const [row] = await ReviewModel.aggregate<{ avg: number; count: number }>([
    { $match: { target, targetId: new Types.ObjectId(String(targetId)), hidden: false } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const rating = { ratingAvg: row ? Math.round(row.avg * 10) / 10 : 0, ratingCount: row?.count ?? 0 };
  if (target === 'event') await EventModel.updateOne({ _id: targetId }, rating);
  else await ProviderModel.updateOne({ _id: targetId }, rating);
  return rating;
}

type ReviewLike = { _id: Types.ObjectId; rating: number; comment?: string | null };

const toReviewView = (review: ReviewLike, authorName: string) => ({
  id: String(review._id),
  rating: review.rating,
  comment: review.comment ?? undefined,
  author: shortName(authorName),
  createdAt: (review as { createdAt?: Date }).createdAt,
});

async function listReviews(target: ReviewTarget, targetId: Types.ObjectId, page: Page) {
  const filter = { target, targetId, hidden: false };
  const [reviews, total] = await Promise.all([
    ReviewModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(page)).limit(page.limit).lean(),
    ReviewModel.countDocuments(filter),
  ]);
  const authors = await UserModel.find({ _id: { $in: reviews.map((review) => review.authorId) } })
    .select('name')
    .lean();
  const nameOf = new Map(authors.map((author) => [String(author._id), author.name]));
  const items = reviews.map((review) => toReviewView(review, nameOf.get(String(review.authorId)) ?? ''));
  return { items, total };
}

export async function listEventReviews(eventId: string, page: Page) {
  const event = await EventModel.findById(eventId).select('status').lean();
  if (!event || !PUBLIC_STATUSES.includes(event.status as EventStatus)) throw AppError.notFound();
  return listReviews('event', event._id, page);
}

export async function reviewEvent(user: { id: string }, eventId: string, input: EventReviewBody) {
  const event = await EventModel.findById(eventId).select('status endAt').lean();
  if (!event) throw AppError.notFound();
  const over = event.status === 'completed' || (event.status === 'published' && event.endAt <= new Date());
  const attended = await TicketModel.exists({ eventId: event._id, holderId: user.id, 'checkIns.0': { $exists: true } });
  if (!over || !attended) throw AppError.forbidden('REVIEW_NOT_ALLOWED');
  if (await ReviewModel.exists({ target: 'event', targetId: event._id, authorId: user.id })) {
    throw AppError.conflict('REVIEW_EXISTS');
  }

  const review = await saveReview({ target: 'event', targetId: event._id, authorId: user.id, ...input });
  await refreshRating('event', event._id);
  const author = await UserModel.findById(user.id).select('name').lean();
  return toReviewView(review, author?.name ?? '');
}

export async function listProviderReviews(providerId: string, page: Page) {
  const provider = await ProviderModel.findOne({ _id: providerId, verification: 'verified' }).select('_id').lean();
  if (!provider) throw AppError.notFound();
  return listReviews('provider', provider._id, page);
}

export async function reviewProvider(user: { id: string }, providerId: string, input: ProviderReviewBody) {
  const provider = await ProviderModel.findById(providerId).select('_id').lean();
  if (!provider) throw AppError.notFound();
  const booking = await BookingModel.findOne({ _id: input.bookingId, organizerId: user.id, status: 'completed' })
    .select('serviceId')
    .lean();
  const service = booking ? await ServiceModel.findById(booking.serviceId).select('providerId').lean() : null;
  if (!service || !provider._id.equals(service.providerId)) throw AppError.forbidden('REVIEW_NOT_ALLOWED');
  if (await ReviewModel.exists({ bookingId: input.bookingId })) throw AppError.conflict('REVIEW_EXISTS');

  const review = await saveReview({ target: 'provider', targetId: provider._id, authorId: user.id, ...input });
  await refreshRating('provider', provider._id);
  const author = await UserModel.findById(user.id).select('name').lean();
  return toReviewView(review, author?.name ?? '');
}

async function organizerEvents(organizerId: string) {
  return EventModel.find({ organizerId }).select('title startAt ratingAvg ratingCount').lean();
}

export async function listOrganizerReviews(organizerId: string, query: OrganizerReviewsQuery) {
  const events = await organizerEvents(organizerId);
  const eventOf = new Map(events.map((event) => [String(event._id), event]));
  if (query.eventId && !eventOf.has(query.eventId)) throw AppError.notFound();

  const targetIds = query.eventId ? [new Types.ObjectId(query.eventId)] : events.map((event) => event._id);
  const filter = {
    target: 'event',
    targetId: { $in: targetIds },
    hidden: false,
    ...(query.rating && { rating: query.rating }),
  };
  const [reviews, total] = await Promise.all([
    ReviewModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skipFor(query)).limit(query.limit).lean(),
    ReviewModel.countDocuments(filter),
  ]);
  const authors = await UserModel.find({ _id: { $in: reviews.map((review) => review.authorId) } })
    .select('name')
    .lean();
  const nameOf = new Map(authors.map((author) => [String(author._id), author.name]));
  const items = reviews.map((review) => {
    const event = eventOf.get(String(review.targetId));
    return {
      ...toReviewView(review, nameOf.get(String(review.authorId)) ?? ''),
      event: event ? { id: String(event._id), title: event.title, startAt: event.startAt } : null,
    };
  });
  return { items, total };
}

export async function organizerReviewSummary(organizerId: string) {
  const events = await organizerEvents(organizerId);
  const [rows, perEvent] = await Promise.all([
    ReviewModel.aggregate<{ _id: number; count: number }>([
      { $match: { target: 'event', targetId: { $in: events.map((event) => event._id) }, hidden: false } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
    ReviewModel.aggregate<{ _id: Types.ObjectId; avg: number; count: number }>([
      { $match: { target: 'event', targetId: { $in: events.map((event) => event._id) }, hidden: false } },
      { $group: { _id: '$targetId', avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]),
  ]);
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<1 | 2 | 3 | 4 | 5, number>;
  let count = 0;
  let sum = 0;
  for (const row of rows) {
    distribution[row._id as 1 | 2 | 3 | 4 | 5] = row.count;
    count += row.count;
    sum += row._id * row.count;
  }
  const eventOf = new Map(events.map((event) => [String(event._id), event]));
  return {
    average: count ? Math.round((sum / count) * 10) / 10 : 0,
    count,
    distribution,
    events: perEvent
      .flatMap((row) => {
        const event = eventOf.get(String(row._id));
        return event
          ? [
              {
                id: String(event._id),
                title: event.title,
                startAt: event.startAt,
                ratingAvg: Math.round(row.avg * 10) / 10,
                ratingCount: row.count,
              },
            ]
          : [];
      })
      .sort((a, b) => b.startAt.getTime() - a.startAt.getTime()),
  };
}
