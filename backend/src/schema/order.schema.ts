import { z } from 'zod';
import { MAX_TICKETS_PER_ORDER } from '../config/constants';
import { ORDER_STATUSES, ORDER_TYPES } from '../types/enums';
import { camPhone, objectId, pageQuery } from './common.schema';

export const createTicketOrderBody = z.object({
  eventId: objectId,
  tierId: objectId,
  quantity: z
    .number('validation.order.items.quantity.required')
    .int('validation.common.quantity.integer')
    .min(1, 'validation.order.items.quantity.min')
    .max(MAX_TICKETS_PER_ORDER, 'validation.order.items.maxTickets'),
  phone: camPhone,
});

export const listMyOrdersQuery = pageQuery.extend({
  type: z.enum(ORDER_TYPES, 'validation.order.type.invalid').optional(),
  status: z.enum(ORDER_STATUSES, 'validation.order.status.invalid').optional(),
});

export const purchaseHeaders = z.object({
  'idempotency-key': z
    .string()
    .regex(/^[A-Za-z0-9_-]{8,100}$/, 'validation.order.idempotencyKey.invalid')
    .optional(),
});

export const webhookParams = z.object({ provider: z.string().max(30) });

export type CreateTicketOrderBody = z.infer<typeof createTicketOrderBody>;
export type ListMyOrdersQuery = z.infer<typeof listMyOrdersQuery>;
