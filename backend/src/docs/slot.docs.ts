import { z } from 'zod';
import { eventIdParam, idParam, pageQuery } from '../schema/common.schema';
import * as s from '../schema/slot.schema';
import { Empty, Exhibitor, ExhibitorEvent, OwnerSlot, SlotBookingView } from './components';
import { route } from './registry';

const tag = 'Exhibitor slots';
const owner = ['organizer (owner)'];

route({
  method: 'get',
  path: '/events/{eventId}/slots',
  tag,
  summary: 'List an event’s display slots',
  description:
    'Public for published and completed events. The owner and admins also see drafts and get `booked` and `reserved`.',
  access: 'optional',
  params: eventIdParam,
  response: z.array(OwnerSlot),
  responseDescription: 'Slots, cheapest first. Public callers get the `Slot` fields only.',
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/events/{eventId}/slots',
  tag,
  summary: 'Add a slot type',
  description: 'Name or number, size, price and how many there are (EXH-1). Not on cancelled or ended events.',
  roles: owner,
  params: eventIdParam,
  body: s.createSlotBody.openapi('CreateSlotBody', {
    example: { label: 'Stand A', size: '3 × 3 m, with a table', price: 30000, quantity: 10 },
  }),
  status: 201,
  response: OwnerSlot,
  errors: { 409: ['EVENT_NOT_EDITABLE'] },
});

route({
  method: 'patch',
  path: '/slots/{id}',
  tag,
  summary: 'Update a slot type',
  description: 'The price is locked once a slot is booked; `quantity` cannot drop below booked + reserved.',
  roles: owner,
  params: idParam,
  body: s.updateSlotBody.openapi('UpdateSlotBody', { example: { quantity: 12 } }),
  response: OwnerSlot,
  errors: { 404: ['NOT_FOUND'], 409: ['EVENT_NOT_EDITABLE', 'SLOT_PRICE_LOCKED', 'SLOT_QUANTITY_BELOW_BOOKED'] },
});

route({
  method: 'delete',
  path: '/slots/{id}',
  tag,
  summary: 'Delete a slot type',
  description: 'Only while nothing is booked or reserved.',
  roles: owner,
  params: idParam,
  response: Empty,
  errors: { 404: ['NOT_FOUND'], 409: ['SLOT_IN_USE'] },
});

route({
  method: 'get',
  path: '/exhibitor/events',
  tag,
  summary: 'Events with open slots',
  description: 'Published events not yet started (or from `from`), soonest first, that still have slots left (EXH-2).',
  roles: ['exhibitor'],
  query: s.exhibitorEventsQuery,
  response: ExhibitorEvent,
  paged: true,
});

route({
  method: 'get',
  path: '/exhibitor/slot-bookings',
  tag,
  summary: 'My slot bookings',
  description: 'Paid bookings and those waiting for payment, newest first.',
  roles: ['exhibitor'],
  query: pageQuery,
  response: SlotBookingView,
  paged: true,
});

route({
  method: 'get',
  path: '/events/{eventId}/exhibitors',
  tag,
  summary: 'Exhibitors at an event',
  description: 'Paid slot bookings with the exhibitor’s name, for the public event page (EXH-4).',
  access: 'public',
  params: eventIdParam,
  response: z.array(Exhibitor),
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'get',
  path: '/events/{eventId}/slot-bookings',
  tag,
  summary: 'Who holds which slot',
  description: 'Paid slot bookings with exhibitor contacts (EXH-4).',
  roles: ['organizer (owner)', 'admin'],
  params: eventIdParam,
  response: z.array(SlotBookingView),
  errors: { 404: ['NOT_FOUND'] },
});
