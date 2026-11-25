import { z } from 'zod';
import { idParam } from '../schema/common.schema';
import * as s from '../schema/event.schema';
import { Category, Empty, Event, EventDetail, EventListItem, EventStats, ShareLinks } from './components';
import { route } from './registry';

const tag = 'Events';
const organizer = ['organizer (owner)'];

const eventExample = {
  title: { en: 'Douala Jazz Night', fr: 'Nuit du jazz de Douala' },
  description: { en: 'Live jazz by the river.', fr: 'Jazz en direct au bord du fleuve.' },
  category: 'concert',
  coverUrl: 'https://res.cloudinary.com/demo/image/upload/events/abc.png',
  venue: 'Salle des fêtes',
  city: 'Douala',
  country: 'Cameroon',
  startAt: '2026-12-20T17:00:00.000Z',
  endAt: '2026-12-20T21:00:00.000Z',
};

route({
  method: 'get',
  path: '/events',
  tag,
  summary: 'List upcoming published events',
  description:
    'Soonest first. Without `from`, only events that have not started. `q` searches titles and descriptions by whole words; `city` and `country` ignore case (EVT-4, EVT-7).',
  access: 'public',
  query: s.listEventsQuery,
  response: EventListItem,
  paged: true,
});

route({
  method: 'get',
  path: '/events/{id}',
  tag,
  summary: 'Get an event page',
  description:
    'Published and completed events are public. Drafts and other statuses are visible to the owner and admins only (404 otherwise). Includes tiers with remaining tickets, the agenda and paid exhibitors (EVT-5).',
  access: 'optional',
  params: idParam,
  response: EventDetail,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'get',
  path: '/events/{id}/share',
  tag,
  summary: 'Get share links',
  description:
    'WhatsApp and Facebook links with the title in the reader’s language (Accept-Language). Instagram has no web share URL: offer “copy link” with `url` (EVT-6).',
  access: 'public',
  params: idParam,
  response: ShareLinks,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/events',
  tag,
  summary: 'Create an event',
  description:
    'Created as `draft`. Start must be in the future and before the end. `category` must be a key from GET /categories (EVT-1).',
  roles: ['organizer'],
  body: s.createEventBody.openapi('CreateEventBody', { example: eventExample }),
  status: 201,
  response: Event,
  errors: { 400: ['INVALID_CATEGORY'] },
});

route({
  method: 'patch',
  path: '/events/{id}',
  tag,
  summary: 'Edit an event',
  description:
    'Draft or rejected: any field (a rejected event becomes a draft again). Published: only `description` and `coverUrl`; other fields return 409 with `details.fields`. Bilingual fields merge per language.',
  roles: organizer,
  params: idParam,
  body: s.updateEventBody.openapi('UpdateEventBody', {
    example: { venue: 'Palais des sports', title: { fr: 'Grande nuit du jazz' } },
  }),
  response: Event,
  errors: { 400: ['INVALID_CATEGORY', 'TIER_SALES_END_AFTER_START'], 404: ['NOT_FOUND'], 409: ['EVENT_NOT_EDITABLE'] },
});

route({
  method: 'delete',
  path: '/events/{id}',
  tag,
  summary: 'Delete a draft',
  description: 'Drafts only. Also deletes its tiers, agenda, checklist, budget, guests, slots and staff assignments.',
  roles: organizer,
  params: idParam,
  response: Empty,
  errors: { 404: ['NOT_FOUND'], 409: ['EVENT_NOT_EDITABLE'] },
});

route({
  method: 'post',
  path: '/events/{id}/submit',
  tag,
  summary: 'Submit for admin approval',
  description:
    'Draft or rejected → `pending`. Needs at least one ticket tier and a start in the future. Admins are notified (EVT-2).',
  roles: organizer,
  params: idParam,
  response: Event,
  errors: { 400: ['EVENT_NEEDS_TIERS', 'EVENT_ALREADY_STARTED'], 404: ['NOT_FOUND'], 409: ['EVENT_NOT_EDITABLE'] },
});

route({
  method: 'post',
  path: '/events/{id}/cancel',
  tag,
  summary: 'Cancel a published event',
  description:
    'Published and not yet ended → `cancelled`. Every ticket holder is notified (EVT-8). Refunds follow once payments are in place.',
  roles: organizer,
  params: idParam,
  body: s.cancelEventBody.openapi('CancelEventBody', { example: { reason: 'The venue is flooded.' } }),
  response: Event,
  errors: { 404: ['NOT_FOUND'], 409: ['EVENT_NOT_CANCELLABLE'] },
});

route({
  method: 'get',
  path: '/events/{id}/stats',
  tag,
  summary: 'Sales and check-in stats',
  description: 'Per tier: sold, reserved, available, checked in. Money totals come from the payment ledger (ACC-6).',
  roles: ['organizer (owner)', 'admin'],
  params: idParam,
  response: EventStats,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'get',
  path: '/organizer/events',
  tag,
  summary: 'List my events',
  description: 'All statuses, newest first.',
  roles: ['organizer'],
  query: s.organizerEventsQuery,
  response: Event,
  paged: true,
});

route({
  method: 'get',
  path: '/categories',
  tag,
  summary: 'List event categories',
  description: 'Labels in English and French. Defaults are returned until an admin sets categories.',
  access: 'public',
  response: z.array(Category),
});
