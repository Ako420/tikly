import { idParam } from '../schema/common.schema';
import * as s from '../schema/booking.schema';
import { BookingView } from './components';
import { route } from './registry';

const tag = 'Bookings';
const provider = ['provider (owner of the service)'];

route({
  method: 'post',
  path: '/bookings',
  tag,
  summary: 'Request a service booking',
  description:
    'For an active service of a verified provider. Link it to one of your events with `eventId` so its cost lands in that event’s budget once paid. The provider is notified (SRV-6).',
  roles: ['organizer'],
  body: s.createBookingBody.openapi('CreateBookingBody', {
    example: {
      serviceId: '6743a1f2c9e77b0012ab34d0',
      eventId: '6743a1f2c9e77b0012ab34cd',
      startDate: '2026-12-19T08:00:00.000Z',
      endDate: '2026-12-20T23:00:00.000Z',
      quantity: 2,
      note: 'Set up near the main stage, please.',
    },
  }),
  status: 201,
  response: BookingView,
  errors: { 403: ['FORBIDDEN'], 404: ['NOT_FOUND'] },
});

route({
  method: 'get',
  path: '/bookings',
  tag,
  summary: 'List my bookings',
  description: 'Organizers see the bookings they made; providers see bookings on their services. Newest first (SRV-7).',
  roles: ['organizer', 'provider'],
  query: s.listBookingsQuery,
  response: BookingView,
  paged: true,
});

route({
  method: 'get',
  path: '/bookings/{id}',
  tag,
  summary: 'Get a booking',
  roles: ['organizer or provider of the booking', 'admin'],
  params: idParam,
  response: BookingView,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/bookings/{id}/accept',
  tag,
  summary: 'Accept a booking and set the final price',
  description: 'Only while `requested`. The organizer is notified to pay with POST /orders/bookings.',
  roles: provider,
  params: idParam,
  body: s.acceptBookingBody.openapi('AcceptBookingBody', { example: { amount: 50000 } }),
  response: BookingView,
  errors: { 404: ['NOT_FOUND'], 409: ['BOOKING_NOT_PENDING'] },
});

route({
  method: 'post',
  path: '/bookings/{id}/decline',
  tag,
  summary: 'Decline a booking',
  description: 'Only while `requested`. The reason is shown to the organizer.',
  roles: provider,
  params: idParam,
  body: s.declineBookingBody.openapi('DeclineBookingBody', { example: { reason: 'Fully booked that weekend.' } }),
  response: BookingView,
  errors: { 404: ['NOT_FOUND'], 409: ['BOOKING_NOT_PENDING'] },
});

route({
  method: 'post',
  path: '/bookings/{id}/cancel',
  tag,
  summary: 'Cancel a booking',
  description: 'Before payment only, and not while a payment is waiting on the phone. The provider is notified.',
  roles: ['organizer (who made the booking)'],
  params: idParam,
  response: BookingView,
  errors: { 404: ['NOT_FOUND'], 409: ['BOOKING_NOT_CANCELLABLE', 'BOOKING_PAYMENT_PENDING'] },
});

route({
  method: 'post',
  path: '/bookings/{id}/complete',
  tag,
  summary: 'Mark a booking as done',
  description: 'Once `paid` and after `endDate`. The organizer can then review the provider.',
  roles: provider,
  params: idParam,
  response: BookingView,
  errors: { 404: ['NOT_FOUND'], 409: ['BOOKING_NOT_COMPLETABLE'] },
});
