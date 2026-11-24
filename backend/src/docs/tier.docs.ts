import { z } from 'zod';
import { eventIdParam, idParam } from '../schema/common.schema';
import * as s from '../schema/tier.schema';
import { Empty, OwnerTier, Tier } from './components';
import { route } from './registry';

const tag = 'Ticket tiers';
const owner = ['organizer (owner)'];

route({
  method: 'get',
  path: '/events/{eventId}/tiers',
  tag,
  summary: 'List an event’s tiers',
  description:
    'Cheapest first. Public for published and completed events. The owner and admins also get `sold` and `reserved`, for any status.',
  access: 'optional',
  params: eventIdParam,
  response: z.array(Tier.extend({ sold: z.number().int().optional(), reserved: z.number().int().optional() })),
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/events/{eventId}/tiers',
  tag,
  summary: 'Add a tier',
  description:
    'Event must be draft or rejected. One tier per name (standard, vip, vvip). Price in whole XAF, 0 for free. Sales end in the future and no later than the event start (TKT-1).',
  roles: owner,
  params: eventIdParam,
  body: s.createTierBody.openapi('CreateTierBody', {
    example: { name: 'vip', price: 15000, quantity: 50, salesEndAt: '2026-12-19T23:00:00.000Z' },
  }),
  status: 201,
  response: OwnerTier,
  errors: { 400: ['SALES_END_AFTER_EVENT_START'], 404: ['NOT_FOUND'], 409: ['TIER_EXISTS', 'EVENT_NOT_EDITABLE'] },
});

route({
  method: 'patch',
  path: '/tiers/{id}',
  tag,
  summary: 'Change a tier',
  description:
    'Allowed until the event is cancelled, completed or suspended. The price locks once a ticket is sold. The quantity can never go below sold + reserved (`details.minimum`).',
  roles: owner,
  params: idParam,
  body: s.updateTierBody.openapi('UpdateTierBody', { example: { quantity: 150 } }),
  response: OwnerTier,
  errors: {
    400: ['SALES_END_AFTER_EVENT_START'],
    404: ['NOT_FOUND'],
    409: ['TIER_PRICE_LOCKED', 'TIER_QUANTITY_BELOW_SOLD', 'EVENT_NOT_EDITABLE'],
  },
});

route({
  method: 'delete',
  path: '/tiers/{id}',
  tag,
  summary: 'Delete a tier',
  description: 'Only while nothing is sold or reserved.',
  roles: owner,
  params: idParam,
  response: Empty,
  errors: { 404: ['NOT_FOUND'], 409: ['TIER_IN_USE'] },
});
