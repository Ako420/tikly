import { Types } from 'mongoose';
import { BookingModel, EventModel, ProviderModel, ReviewModel, ServiceModel, TicketModel, UserModel } from '../model';
import type { EventReviewBody, ProviderReviewBody } from '../schema/review.schema';
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
