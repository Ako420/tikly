import { z } from 'zod';
import { ORDER_STATUSES, TICKET_STATUSES } from '../types/enums';
import { objectId, pageQuery } from './common.schema';

const search = z.string().trim().max(100).optional();

export const eventOrdersQuery = pageQuery.extend({
  status: z.enum(ORDER_STATUSES, 'validation.order.status.invalid').optional(),
  q: search,
});

export const eventAttendeesQuery = pageQuery.extend({
  status: z.enum(TICKET_STATUSES, 'validation.ticket.status.invalid').optional(),
  tierId: objectId.optional(),
  q: search,
});

export type EventOrdersQuery = z.infer<typeof eventOrdersQuery>;
export type EventAttendeesQuery = z.infer<typeof eventAttendeesQuery>;
