import * as s from '../schema/review.schema';
import { ReviewView } from './components';
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
