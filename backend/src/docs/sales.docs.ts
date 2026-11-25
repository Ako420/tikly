import { z } from 'zod';
import { eventIdParam } from '../schema/common.schema';
import * as s from '../schema/sales.schema';
import { ORDER_STATUSES, TICKET_STATUSES, TIER_NAMES } from '../types/enums';
import { registry, route } from './registry';

const tag = 'Orders and attendees';
const owner = ['organizer (owner)', 'admin'];
const id = z.string().openapi({ example: '6743a1f2c9e77b0012ab34cd' });

const Person = registry.register(
  'SalesPerson',
  z.object({
    id,
    name: z.string().openapi({ example: 'Ama Ngono' }),
    email: z.string().optional().openapi({ example: 'ama@example.com' }),
    phone: z.string().optional().openapi({ example: '+237670000123' }),
  }),
);

const EventOrder = registry.register(
  'EventOrder',
  z.object({
    id,
    buyer: Person,
    phone: z.string().optional().openapi({ description: 'The Mobile Money number that paid.' }),
    amount: z.number().int().openapi({ example: 20000 }),
    status: z.enum(ORDER_STATUSES),
    tickets: z.number().int().openapi({ example: 2 }),
    items: z.array(
      z.object({
        tier: z.enum(TIER_NAMES),
        quantity: z.number().int().openapi({ example: 2 }),
        unitPrice: z.number().int().openapi({ example: 10000 }),
      }),
    ),
    createdAt: z.string().datetime(),
    paidAt: z.string().datetime().optional(),
  }),
);

const EventAttendee = registry.register(
  'EventAttendee',
  z.object({
    id,
    code: z.string().openapi({ example: 'EVT-4F7K-2Q9M' }),
    tier: z.enum(TIER_NAMES),
    holder: Person,
    orderId: id,
    status: z.enum(TICKET_STATUSES),
    checkedInAt: z.string().datetime().optional().openapi({ description: 'First entry scan.' }),
    reentries: z.number().int().openapi({ example: 0, description: 'Scans after the first entry.' }),
    createdAt: z.string().datetime(),
  }),
);

route({
  method: 'get',
  path: '/events/{eventId}/orders',
  tag,
  summary: 'List an event’s ticket orders',
  description: 'Newest first. `q` matches the buyer’s name, email or phone, the paying number, or a ticket code.',
  roles: owner,
  params: eventIdParam,
  query: s.eventOrdersQuery,
  response: EventOrder,
  paged: true,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'get',
  path: '/events/{eventId}/attendees',
  tag,
  summary: 'List an event’s attendees',
  description: 'One row per ticket, newest first. `q` matches the holder’s name, email or phone, or a ticket code.',
  roles: owner,
  params: eventIdParam,
  query: s.eventAttendeesQuery,
  response: EventAttendee,
  paged: true,
  errors: { 404: ['NOT_FOUND'] },
});
