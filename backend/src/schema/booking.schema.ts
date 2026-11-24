import { z } from 'zod';
import { MIN_PAYMENT_AMOUNT } from '../config/constants';
import { BOOKING_STATUSES } from '../types/enums';
import { objectId, pageQuery } from './common.schema';

const MAX_AMOUNT = 100_000_000;
const MAX_QUANTITY = 10_000;

export const createBookingBody = z
  .object({
    serviceId: objectId,
    eventId: objectId.optional(),
    startDate: z.coerce
      .date('validation.booking.startDate.required')
      .refine((date) => date > new Date(), 'validation.booking.startDate.future'),
    endDate: z.coerce.date('validation.booking.endDate.required'),
    quantity: z
      .number('validation.booking.quantity.required')
      .int('validation.common.quantity.integer')
      .min(1, 'validation.booking.quantity.min')
      .max(MAX_QUANTITY, 'validation.booking.quantity.max'),
    note: z.string().trim().max(1000, 'validation.booking.note.maxLength').optional(),
  })
  .refine((body) => body.endDate >= body.startDate, {
    message: 'validation.booking.endDate.afterStart',
    path: ['endDate'],
  });

export const listBookingsQuery = pageQuery.extend({
  status: z.enum(BOOKING_STATUSES, 'validation.booking.status.invalid').optional(),
});

export const acceptBookingBody = z.object({
  amount: z
    .number('validation.booking.amount.required')
    .int('validation.common.amount.integer')
    .min(MIN_PAYMENT_AMOUNT, 'validation.booking.amount.minPayment')
    .max(MAX_AMOUNT, 'validation.common.amount.max'),
});

export const declineBookingBody = z.object({
  reason: z.string().trim().max(500, 'validation.booking.declineReason.maxLength').optional(),
});

export type CreateBookingBody = z.infer<typeof createBookingBody>;
export type ListBookingsQuery = z.infer<typeof listBookingsQuery>;
export type AcceptBookingBody = z.infer<typeof acceptBookingBody>;
export type DeclineBookingBody = z.infer<typeof declineBookingBody>;
