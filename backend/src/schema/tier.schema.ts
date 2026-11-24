import { z } from 'zod';
import { TIER_NAMES } from '../types/enums';
import { objectId } from './common.schema';

const MAX_PRICE = 10_000_000;
const MAX_QUANTITY = 100_000;

const price = z
  .number('validation.ticketTier.price.required')
  .int('validation.common.amount.integer')
  .min(0, 'validation.ticketTier.price.min')
  .max(MAX_PRICE, 'validation.ticketTier.price.max');

const quantity = z
  .number('validation.ticketTier.quantity.required')
  .int('validation.common.quantity.integer')
  .min(1, 'validation.ticketTier.quantity.min')
  .max(MAX_QUANTITY, 'validation.ticketTier.quantity.max');

const salesEndAt = z.coerce
  .date('validation.ticketTier.salesEndAt.required')
  .refine((date) => date > new Date(), 'validation.ticketTier.salesEndAt.future');

export const eventIdParam = z.object({ eventId: objectId });

export const createTierBody = z.object({
  name: z.enum(TIER_NAMES, 'validation.ticketTier.name.invalid'),
  price,
  quantity,
  salesEndAt,
});

export const updateTierBody = z
  .object({ price: price.optional(), quantity: quantity.optional(), salesEndAt: salesEndAt.optional() })
  .refine((body) => Object.values(body).some((value) => value !== undefined), 'validation.common.emptyUpdate');

export type CreateTierBody = z.infer<typeof createTierBody>;
export type UpdateTierBody = z.infer<typeof updateTierBody>;
