import { idParam } from '../schema/common.schema';
import * as s from '../schema/ticket.schema';
import { PdfFile, Ticket, TicketCancellation } from './components';
import { route } from './registry';

const tag = 'Tickets';

route({
  method: 'get',
  path: '/me/tickets',
  tag,
  summary: 'List my tickets',
  description:
    '`when=upcoming` (default): events that have not ended, soonest first. `when=past`: ended events, latest first. Each ticket carries its `qrToken` for the in-app QR (TKT-6).',
  roles: ['attendee'],
  query: s.myTicketsQuery,
  response: Ticket,
  paged: true,
});

route({
  method: 'get',
  path: '/tickets/{id}',
  tag,
  summary: 'Get one ticket',
  description:
    'The holder’s own ticket (admins can read any). There is no transfer endpoint: tickets stay with the buyer (TKT-7).',
  params: idParam,
  response: Ticket,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'get',
  path: '/tickets/{id}/pdf',
  tag,
  summary: 'Download the ticket as a PDF',
  description: 'One A6 page with the event, holder, ticket code and QR code, in the holder’s language (TKT-6).',
  params: idParam,
  response: PdfFile,
  pdf: true,
  responseDescription: 'The PDF file',
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/tickets/{id}/cancel',
  tag,
  summary: 'Cancel a ticket for a 50% refund',
  description: [
    'Only for an unused ticket of a published event that starts in more than 48 hours (TKT-8). Half the price paid is sent back by mobile money to the phone that paid; the seat goes back on sale. Free tickets are simply cancelled.',
    'Rate limited to 5 requests a minute per user.',
  ].join('\n\n'),
  roles: ['attendee (holder)'],
  params: idParam,
  response: TicketCancellation,
  errors: {
    404: ['NOT_FOUND'],
    409: ['TICKET_NOT_REFUNDABLE', 'REFUND_WINDOW_CLOSED', 'REFUND_BELOW_MINIMUM'],
    429: ['RATE_LIMITED'],
    502: ['PAYMENT_PROVIDER_ERROR'],
    503: ['PAYOUTS_NOT_CONFIGURED'],
  },
});
