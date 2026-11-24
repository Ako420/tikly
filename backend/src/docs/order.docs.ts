import { z } from 'zod';
import { idParam } from '../schema/common.schema';
import * as s from '../schema/order.schema';
import { Order } from './components';
import { route } from './registry';

const tag = 'Orders';
const limited = 'Rate limited to 5 requests a minute per user.';

route({
  method: 'post',
  path: '/orders/tickets',
  tag,
  summary: 'Buy tickets with Mobile Money or Orange Money',
  description: [
    'Reserves the tickets for 10 minutes and sends a payment prompt to `phone` through Fapshi (TKT-2, TKT-3). The buyer confirms on their phone.',
    'Then poll `GET /orders/{id}` every 3 seconds until `status` leaves `pending`. Tickets are in `tickets` once `paid`. Offer an “I have paid” button that calls `/orders/{id}/verify`.',
    'Free tiers are paid at once and return tickets immediately.',
    '**Send an `Idempotency-Key`** (a new UUID per Buy tap, reused when retrying the same tap after a timeout). A retry with the same key returns the first order with 200 instead of reserving and charging again; the same key with a different event, tier or quantity returns 409.',
    'If Fapshi does not answer, the server checks with Fapshi whether the prompt was created before giving up, so a 502 means no prompt is waiting on the phone.',
    '**Sandbox:** 670000000 / 690000000 always succeed, 670000001 / 690000001 always fail.',
    limited,
  ].join('\n\n'),
  roles: ['attendee'],
  body: s.createTicketOrderBody.openapi('CreateTicketOrderBody', {
    example: {
      eventId: '6743a1f2c9e77b0012ab34cd',
      tierId: '6743a1f2c9e77b0012ab34ce',
      quantity: 2,
      phone: '670000000',
    },
  }),
  headers: z.object({
    'idempotency-key': z
      .string()
      .optional()
      .openapi({ example: '7f3c2a9e-4b1d-4c8e-9a2f-1d2e3f4a5b6c', description: '8–100 letters, digits, - or _.' }),
  }),
  status: 201,
  response: Order,
  responseDescription: 'Order created',
  alsoStatus: { status: 200, description: 'Same Idempotency-Key as an earlier purchase: that order is returned' },
  errors: {
    400: ['EVENT_NOT_PUBLISHED'],
    404: ['NOT_FOUND'],
    409: ['TIER_SOLD_OUT', 'SALES_CLOSED', 'IDEMPOTENCY_KEY_REUSED'],
    429: ['RATE_LIMITED'],
    502: ['PAYMENT_PROVIDER_ERROR'],
  },
});

route({
  method: 'post',
  path: '/orders/bookings',
  tag,
  summary: 'Pay an accepted service booking',
  description: [
    'Charges the price the provider set when accepting (`amount`) through Fapshi. Poll `GET /orders/{id}` as for tickets (SRV-6).',
    'Once paid, the booking becomes `paid`, the provider is notified and, if the booking is for one of your events, its cost is added to that event’s budget (PLN-6).',
    'A payment that is already waiting on the phone returns 409 `BOOKING_PAYMENT_PENDING` with its `orderId`. After a failed or expired payment, pay again.',
    'Send an `Idempotency-Key` exactly as for tickets.',
    limited,
  ].join('\n\n'),
  roles: ['organizer (who made the booking)'],
  body: s.createBookingOrderBody.openapi('CreateBookingOrderBody', {
    example: { bookingId: '6743a1f2c9e77b0012ab34d1', phone: '670000000' },
  }),
  headers: z.object({
    'idempotency-key': z
      .string()
      .optional()
      .openapi({ example: '7f3c2a9e-4b1d-4c8e-9a2f-1d2e3f4a5b6c', description: '8–100 letters, digits, - or _.' }),
  }),
  status: 201,
  response: Order,
  responseDescription: 'Order created',
  alsoStatus: { status: 200, description: 'Same Idempotency-Key as an earlier payment: that order is returned' },
  errors: {
    404: ['NOT_FOUND'],
    409: ['BOOKING_NOT_PAYABLE', 'BOOKING_PAYMENT_PENDING', 'IDEMPOTENCY_KEY_REUSED'],
    429: ['RATE_LIMITED'],
    502: ['PAYMENT_PROVIDER_ERROR'],
  },
});

route({
  method: 'get',
  path: '/orders/{id}',
  tag,
  summary: 'Get an order',
  description:
    'The buyer’s own order (admins can read any). Poll this while `status` is `pending`; it never calls the payment provider.',
  params: idParam,
  response: Order,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/orders/{id}/verify',
  tag,
  summary: 'Check the payment now',
  description: `For an “I have paid” button: asks Fapshi for the payment status and settles the order if it changed. Also works on an expired or failed order whose payment went through late. ${limited}`,
  params: idParam,
  response: Order,
  errors: { 404: ['NOT_FOUND'], 429: ['RATE_LIMITED'], 502: ['PAYMENT_PROVIDER_ERROR'] },
});

route({
  method: 'get',
  path: '/me/orders',
  tag,
  summary: 'List my orders',
  description: 'Newest first.',
  query: s.listMyOrdersQuery,
  response: Order,
  paged: true,
});
