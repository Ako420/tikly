import { z } from 'zod';
import { MIN_PAYMENT_AMOUNT } from '../config/constants';
import { camPhone, eventIdParam, objectId, pageQuery } from './common.schema';

const MAX_PRICE = 100_000_000;
const MAX_QUANTITY = 10_000;
export const MAX_SLOTS_PER_ORDER = 20;

const label = z
  .string('validation.slot.label.required')
  .trim()
  .min(1, 'validation.slot.label.required')
  .max(100, 'validation.slot.label.maxLength');
const size = z.string().trim().max(100, 'validation.slot.size.maxLength');
const price = z
  .number('validation.slot.price.required')
  .int('validation.common.amount.integer')
  .min(0, 'validation.slot.price.min')
  .max(MAX_PRICE, 'validation.common.amount.max')
  .refine((value) => value === 0 || value >= MIN_PAYMENT_AMOUNT, 'validation.slot.price.minPaid');
const quantity = z
  .number('validation.slot.quantity.required')
  .int('validation.common.quantity.integer')
  .min(1, 'validation.slot.quantity.min')
  .max(MAX_QUANTITY, 'validation.slot.quantity.max');

export const createSlotBody = z.object({ label, size: size.optional(), price, quantity });

export const updateSlotBody = z
  .object({ label: label.optional(), size: size.optional(), price: price.optional(), quantity: quantity.optional() })
  .refine((body) => Object.values(body).some((value) => value !== undefined), 'validation.common.emptyUpdate');

export const exhibitorEventsQuery = pageQuery.extend({
  city: z.string('validation.common.invalidValue').trim().min(1, 'validation.common.invalidValue').max(100).optional(),
  from: z.coerce.date('validation.common.invalidValue').optional(),
});

export const createSlotOrderBody = z.object({
  slotId: objectId,
  quantity: z
    .number('validation.slotBooking.quantity.required')
    .int('validation.common.quantity.integer')
    .min(1, 'validation.slotBooking.quantity.min')
    .max(MAX_SLOTS_PER_ORDER, 'validation.slotBooking.quantity.max'),
  phone: camPhone,
});

export { eventIdParam };

export type CreateSlotBody = z.infer<typeof createSlotBody>;
export type UpdateSlotBody = z.infer<typeof updateSlotBody>;
export type ExhibitorEventsQuery = z.infer<typeof exhibitorEventsQuery>;
export type CreateSlotOrderBody = z.infer<typeof createSlotOrderBody>;
