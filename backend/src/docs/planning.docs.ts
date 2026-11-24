import { z } from 'zod';
import { eventIdParam } from '../schema/common.schema';
import * as s from '../schema/planning.schema';
import { AgendaItem, Budget, BudgetItem, Checklist, ChecklistItem, Empty, Guest, ImportResult } from './components';
import { route } from './registry';

const owner = ['organizer (owner)'];
const ownerOrAdmin = ['organizer (owner)', 'admin (read only)'];
const missing = { 404: ['NOT_FOUND'] };

route({
  method: 'get',
  path: '/events/{eventId}/budget',
  tag: 'Planning: budget',
  summary: 'Get the budget',
  description:
    'Expense lines plus totals. `income` is the organizer’s share of paid ticket and slot sales, after commission (PLN-1, PLN-2).',
  roles: ownerOrAdmin,
  params: eventIdParam,
  response: Budget,
  errors: missing,
});

route({
  method: 'post',
  path: '/events/{eventId}/budget',
  tag: 'Planning: budget',
  summary: 'Add a budget line',
  description:
    'Send `bookingId` to link one of your accepted or paid marketplace bookings for this event; a paid booking fills `actual` with its amount (PLN-6).',
  roles: owner,
  params: eventIdParam,
  body: s.createBudgetItemBody.openapi('CreateBudgetItemBody', {
    example: { label: 'Hall rental', category: 'venue', planned: 300000, actual: 0 },
  }),
  status: 201,
  response: BudgetItem,
  errors: { 400: ['BOOKING_NOT_LINKABLE'], 404: ['NOT_FOUND'], 409: ['BOOKING_ALREADY_LINKED'] },
});

route({
  method: 'patch',
  path: '/events/{eventId}/budget/{itemId}',
  tag: 'Planning: budget',
  summary: 'Edit a budget line',
  roles: owner,
  params: s.budgetItemParam,
  body: s.updateBudgetItemBody.openapi('UpdateBudgetItemBody', { example: { actual: 280000 } }),
  response: BudgetItem,
  errors: missing,
});

route({
  method: 'delete',
  path: '/events/{eventId}/budget/{itemId}',
  tag: 'Planning: budget',
  summary: 'Delete a budget line',
  roles: owner,
  params: s.budgetItemParam,
  response: Empty,
  errors: missing,
});

route({
  method: 'get',
  path: '/events/{eventId}/checklist',
  tag: 'Planning: checklist',
  summary: 'Get the checklist',
  description: 'Sorted by due date, undated tasks last, with the percent done (PLN-3).',
  roles: ownerOrAdmin,
  params: eventIdParam,
  response: Checklist,
  errors: missing,
});

route({
  method: 'post',
  path: '/events/{eventId}/checklist',
  tag: 'Planning: checklist',
  summary: 'Add a task',
  roles: owner,
  params: eventIdParam,
  body: s.createChecklistItemBody.openapi('CreateChecklistItemBody', {
    example: { title: 'Book the hall', dueAt: '2026-12-01T09:00:00.000Z' },
  }),
  status: 201,
  response: ChecklistItem,
  errors: missing,
});

route({
  method: 'patch',
  path: '/events/{eventId}/checklist/{itemId}',
  tag: 'Planning: checklist',
  summary: 'Edit or tick a task',
  description: 'Send `dueAt: null` to remove the due date.',
  roles: owner,
  params: s.checklistItemParam,
  body: s.updateChecklistItemBody.openapi('UpdateChecklistItemBody', { example: { done: true } }),
  response: ChecklistItem,
  errors: missing,
});

route({
  method: 'delete',
  path: '/events/{eventId}/checklist/{itemId}',
  tag: 'Planning: checklist',
  summary: 'Delete a task',
  roles: owner,
  params: s.checklistItemParam,
  response: Empty,
  errors: missing,
});

route({
  method: 'get',
  path: '/events/{eventId}/guests',
  tag: 'Planning: guests',
  summary: 'List guests',
  description: 'Sorted by name. `q` searches name, email and phone (PLN-4).',
  roles: ownerOrAdmin,
  params: eventIdParam,
  query: s.listGuestsQuery,
  response: Guest,
  paged: true,
  errors: missing,
});

route({
  method: 'post',
  path: '/events/{eventId}/guests',
  tag: 'Planning: guests',
  summary: 'Add a guest',
  roles: owner,
  params: eventIdParam,
  body: s.createGuestBody.openapi('CreateGuestBody', {
    example: { name: 'Bello Speaker', phone: '699112233', email: 'bello@example.cm', category: 'speaker' },
  }),
  status: 201,
  response: Guest,
  errors: missing,
});

route({
  method: 'post',
  path: '/events/{eventId}/guests/import-buyers',
  tag: 'Planning: guests',
  summary: 'Import ticket buyers as guests',
  description:
    'One guest per ticket holder, with their best tier as the category. Holders already on the list (same phone or email) and refunded tickets are skipped, so it is safe to run again.',
  roles: owner,
  params: eventIdParam,
  response: ImportResult,
  errors: missing,
});

route({
  method: 'patch',
  path: '/events/{eventId}/guests/{guestId}',
  tag: 'Planning: guests',
  summary: 'Edit a guest',
  description: 'Send `phone: null` or `email: null` to remove them.',
  roles: owner,
  params: s.guestParam,
  body: s.updateGuestBody.openapi('UpdateGuestBody', { example: { category: 'press' } }),
  response: Guest,
  errors: missing,
});

route({
  method: 'delete',
  path: '/events/{eventId}/guests/{guestId}',
  tag: 'Planning: guests',
  summary: 'Remove a guest',
  roles: owner,
  params: s.guestParam,
  response: Empty,
  errors: missing,
});

route({
  method: 'get',
  path: '/events/{eventId}/agenda',
  tag: 'Planning: agenda',
  summary: 'Get the agenda',
  description:
    'Sorted by start. Public once the event is published or completed; before that, owner and admins only (PLN-5).',
  access: 'optional',
  params: eventIdParam,
  response: z.array(AgendaItem),
  errors: missing,
});

route({
  method: 'post',
  path: '/events/{eventId}/agenda',
  tag: 'Planning: agenda',
  summary: 'Add a session',
  description: 'Sessions must fall within the event start and end.',
  roles: owner,
  params: eventIdParam,
  body: s.createAgendaItemBody.openapi('CreateAgendaItemBody', {
    example: {
      title: 'Headliner',
      startAt: '2026-12-20T19:00:00.000Z',
      endAt: '2026-12-20T20:00:00.000Z',
      speaker: 'Manu',
      location: 'Main stage',
    },
  }),
  status: 201,
  response: AgendaItem,
  errors: { 400: ['AGENDA_OUTSIDE_EVENT'], 404: ['NOT_FOUND'] },
});

route({
  method: 'patch',
  path: '/events/{eventId}/agenda/{itemId}',
  tag: 'Planning: agenda',
  summary: 'Edit a session',
  description: 'Send `speaker: null` or `location: null` to remove them.',
  roles: owner,
  params: s.agendaItemParam,
  body: s.updateAgendaItemBody.openapi('UpdateAgendaItemBody', { example: { title: 'Keynote' } }),
  response: AgendaItem,
  errors: { 400: ['AGENDA_OUTSIDE_EVENT'], 404: ['NOT_FOUND'] },
});

route({
  method: 'delete',
  path: '/events/{eventId}/agenda/{itemId}',
  tag: 'Planning: agenda',
  summary: 'Delete a session',
  roles: owner,
  params: s.agendaItemParam,
  response: Empty,
  errors: missing,
});
