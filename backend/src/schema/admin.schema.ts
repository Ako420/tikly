import { z } from 'zod';
import { EVENT_STATUSES, ROLES, VERIFICATION_STATUSES } from '../types/enums';
import { pageQuery } from './common.schema';

const reason = (requiredKey: string, maxKey: string) =>
  z.string(requiredKey).trim().min(1, requiredKey).max(500, maxKey);
const optionalDate = z.coerce.date('validation.common.invalidValue').optional();

export const adminEventsQuery = pageQuery.extend({
  status: z.enum(EVENT_STATUSES, 'validation.event.status.invalid').default('pending'),
});

export const rejectEventBody = z.object({
  reason: reason('validation.event.rejectionReason.required', 'validation.event.rejectionReason.maxLength'),
});

export const eventStatusBody = z.object({
  status: z.enum(['published', 'suspended'], 'validation.event.status.invalid'),
});

export const adminProvidersQuery = pageQuery.extend({
  verification: z.enum(VERIFICATION_STATUSES, 'validation.provider.verification.invalid').default('pending'),
});

export const rejectProviderBody = z.object({
  reason: reason('validation.provider.rejectionReason.required', 'validation.provider.rejectionReason.maxLength'),
});

export const adminUsersQuery = pageQuery.extend({
  role: z.enum(ROLES, 'validation.user.role.invalid').optional(),
  status: z.enum(['active', 'suspended', 'disabled'], 'validation.user.status.invalid').optional(),
  q: z.string('validation.common.invalidValue').trim().min(1, 'validation.common.invalidValue').max(100).optional(),
});

export const userStatusBody = z.object({
  status: z.enum(['active', 'suspended'], 'validation.user.status.invalid'),
});

export const serviceStatusBody = z.object({ active: z.boolean('validation.common.invalidValue') });

export const hideReviewBody = z.object({ hidden: z.boolean('validation.common.invalidValue') });

export const statsQuery = z
  .object({ from: optionalDate, to: optionalDate })
  .refine((query) => !query.from || !query.to || query.from <= query.to, 'validation.common.dateRange');

const rate = z
  .number('validation.setting.commission.range')
  .min(0, 'validation.setting.commission.range')
  .max(30, 'validation.setting.commission.range');

const category = z.object({
  key: z
    .string('validation.setting.categories.key.required')
    .trim()
    .toLowerCase()
    .min(1, 'validation.setting.categories.key.required')
    .max(50, 'validation.setting.categories.key.invalid')
    .regex(/^[a-z0-9-]+$/, 'validation.setting.categories.key.invalid'),
  en: z
    .string('validation.setting.categories.en.required')
    .trim()
    .min(1, 'validation.setting.categories.en.required')
    .max(60),
  fr: z
    .string('validation.setting.categories.fr.required')
    .trim()
    .min(1, 'validation.setting.categories.fr.required')
    .max(60),
});

export const updateSettingsBody = z
  .object({
    commission: z.object({ ticket: rate.optional(), service: rate.optional(), slot: rate.optional() }).optional(),
    categories: z
      .array(category)
      .min(1, 'validation.setting.categories.min')
      .max(50, 'validation.setting.categories.max')
      .refine(
        (items) => new Set(items.map((item) => item.key)).size === items.length,
        'validation.setting.categories.duplicate',
      )
      .optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), 'validation.common.emptyUpdate');

export type AdminEventsQuery = z.infer<typeof adminEventsQuery>;
export type AdminProvidersQuery = z.infer<typeof adminProvidersQuery>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuery>;
export type StatsQuery = z.infer<typeof statsQuery>;
export type UpdateSettingsBody = z.infer<typeof updateSettingsBody>;
