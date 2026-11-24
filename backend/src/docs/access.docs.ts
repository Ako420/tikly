import { z } from 'zod';
import * as s from '../schema/access.schema';
import { eventIdParam, idParam } from '../schema/common.schema';
import { CheckinCounts, GateTicket, ScanOutcome } from './components';
import { route } from './registry';

const tag = 'Access control';
const gate = ['staff (assigned to the event)', 'organizer (owner)'];

route({
  method: 'post',
  path: '/access/scan',
  tag,
  summary: 'Scan a ticket at the gate',
  description: [
    'Send the scanned `qrToken`, or the printed ticket `code` when the QR will not scan (ACC-3, ACC-5).',
    'Always 200 with a `result`; only auth and validation problems return 4xx. Two gates scanning the same ticket at once get one VALID and one ALREADY_CHECKED_IN.',
  ].join('\n\n'),
  roles: gate,
  body: s.scanBody.openapi('ScanBody', {
    example: { eventId: '6743a1f2c9e77b0012ab34cd', qrToken: '6743a1f2c9e77b0012ab34ce.AbCdEfGhIjKlMnOpQrStUv' },
  }),
  response: ScanOutcome,
  errors: { 403: ['NOT_ASSIGNED_TO_EVENT'], 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/access/tickets/{id}/reentry',
  tag,
  summary: 'Let a checked-in ticket back in',
  description:
    'Staff decide; this records a `reentry` with an optional note. The ticket must already have entered (ACC-4).',
  roles: gate,
  params: idParam,
  body: s.reentryBody.openapi('ReentryBody', {
    example: { eventId: '6743a1f2c9e77b0012ab34cd', note: 'Went to the car park' },
  }),
  response: GateTicket,
  errors: {
    403: ['NOT_ASSIGNED_TO_EVENT'],
    404: ['NOT_FOUND'],
    409: ['TICKET_NOT_CHECKED_IN', 'TICKET_NOT_VALID'],
  },
});

route({
  method: 'get',
  path: '/access/lookup',
  tag,
  summary: 'Find tickets by code or buyer phone',
  description:
    'For when a QR will not scan (ACC-5). Phone matches the holder’s account or the phone that paid. Up to 20 tickets; admit one with POST /access/scan and its `code`.',
  roles: gate,
  query: s.lookupQuery,
  response: z.array(GateTicket),
  errors: { 403: ['NOT_ASSIGNED_TO_EVENT'], 404: ['NOT_FOUND'] },
});

route({
  method: 'get',
  path: '/events/{eventId}/checkins',
  tag,
  summary: 'Live check-in counts per tier',
  description: 'Poll every few seconds during the event (ACC-6).',
  roles: ['organizer (owner)', 'admin'],
  params: eventIdParam,
  response: CheckinCounts,
  errors: { 404: ['NOT_FOUND'] },
});
