import { z } from 'zod';
import { eventIdParam, objectId, pageQuery } from './common.schema';

const rating = z
  .number('validation.review.rating.required')
  .int('validation.review.rating.integer')
  .min(1, 'validation.review.rating.range')
  .max(5, 'validation.review.rating.range');
const comment = z.string().trim().max(1000, 'validation.review.comment.maxLength');

export const eventReviewBody = z.object({ rating, comment: comment.optional() });

export const providerReviewBody = z.object({ rating, comment: comment.optional(), bookingId: objectId });

export const providerIdParam = z.object({ providerId: objectId });

export const organizerReviewsQuery = pageQuery.extend({
  eventId: objectId.optional(),
  rating: z.coerce
    .number('validation.review.rating.integer')
    .int('validation.review.rating.integer')
    .min(1, 'validation.review.rating.range')
    .max(5, 'validation.review.rating.range')
    .optional(),
});

export { eventIdParam, pageQuery };

export type EventReviewBody = z.infer<typeof eventReviewBody>;
export type ProviderReviewBody = z.infer<typeof providerReviewBody>;
export type OrganizerReviewsQuery = z.infer<typeof organizerReviewsQuery>;
