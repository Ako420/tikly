import * as s from '../schema/review.schema';
import { z } from 'zod';
import { ReviewView } from './components';
import { registry } from './registry';
import { route } from './registry';

const tag = 'Reviews';
const ratingNote = 'The target’s `ratingAvg` and `ratingCount` are updated at once (REV-3).';

route({
  method: 'get',
  path: '/events/{eventId}/reviews',
  tag,
  summary: 'Reviews of an event',
  description: 'Newest first. Hidden reviews are left out.',
  access: 'public',
  params: s.eventIdParam,
  query: s.pageQuery,
  response: ReviewView,
  paged: true,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/events/{eventId}/reviews',
  tag,
  summary: 'Review an event I attended',
  description: `Once the event has ended, for attendees whose ticket was scanned at the gate. One review per person (REV-1). ${ratingNote}`,
  roles: ['attendee'],
  params: s.eventIdParam,
  body: s.eventReviewBody.openapi('EventReviewBody', {
    example: { rating: 5, comment: 'Great sound and well organised.' },
  }),
  status: 201,
  response: ReviewView,
  errors: { 403: ['REVIEW_NOT_ALLOWED'], 404: ['NOT_FOUND'], 409: ['REVIEW_EXISTS'] },
});

route({
  method: 'get',
  path: '/providers/{providerId}/reviews',
  tag,
  summary: 'Reviews of a provider',
  description: 'Verified providers only. Newest first; hidden reviews are left out.',
  access: 'public',
  params: s.providerIdParam,
  query: s.pageQuery,
  response: ReviewView,
  paged: true,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/providers/{providerId}/reviews',
  tag,
  summary: 'Review a provider after a booking',
  description: `For your own booking of this provider, once the provider has marked it \`completed\`. One review per booking (REV-2). ${ratingNote}`,
  roles: ['organizer'],
  params: s.providerIdParam,
  body: s.providerReviewBody.openapi('ProviderReviewBody', {
    example: { rating: 4, comment: 'On time, clean canopies.', bookingId: '6743a1f2c9e77b0012ab34d1' },
  }),
  status: 201,
  response: ReviewView,
  errors: { 403: ['REVIEW_NOT_ALLOWED'], 404: ['NOT_FOUND'], 409: ['REVIEW_EXISTS'] },
});

const bilingual = z.object({ en: z.string().optional(), fr: z.string().optional() });
const eventRef = z.object({
  id: z.string().openapi({ example: '6743a1f2c9e77b0012ab34cd' }),
  title: bilingual,
  startAt: z.string().datetime(),
});

const OrganizerReview = registry.register(
  'OrganizerReview',
  ReviewView.extend({ event: eventRef.nullable() }),
);

const OrganizerReviewSummary = registry.register(
  'OrganizerReviewSummary',
  z.object({
    average: z.number().openapi({ example: 4.3, description: 'Across all your events, one decimal; 0 when there are none.' }),
    count: z.number().int().openapi({ example: 37 }),
    distribution: z
      .object({ 1: z.number().int(), 2: z.number().int(), 3: z.number().int(), 4: z.number().int(), 5: z.number().int() })
      .openapi({ description: 'Number of reviews per star rating.' }),
    events: z.array(
      eventRef.extend({
        ratingAvg: z.number().openapi({ example: 4.5 }),
        ratingCount: z.number().int().openapi({ example: 12 }),
      }),
    ),
  }),
);

route({
  method: 'get',
  path: '/organizer/reviews',
  tag,
  summary: 'Reviews of my events',
  description: 'Attendee reviews across all your events, newest first. Filter by `eventId` or star `rating`. Hidden reviews are left out.',
  roles: ['organizer'],
  query: s.organizerReviewsQuery,
  response: OrganizerReview,
  paged: true,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'get',
  path: '/organizer/reviews/summary',
  tag,
  summary: 'Rating summary of my events',
  description: 'Overall average, count and star breakdown, plus each reviewed event’s average, newest event first (REV-3).',
  roles: ['organizer'],
  response: OrganizerReviewSummary,
});
