import { z } from 'zod';
import { newPassword, personName } from './auth.schema';
import { camPhone, eventIdParam, objectId } from './common.schema';

export const createStaffBody = z.object({ name: personName, phone: camPhone, password: newPassword });

export const updateStaffBody = z
  .object({
    name: personName.optional(),
    password: newPassword.optional(),
    status: z.enum(['active', 'disabled'], 'validation.user.status.invalid').optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), 'validation.common.emptyUpdate');

export const assignStaffBody = z.object({ staffId: objectId });

export const eventStaffParam = eventIdParam.extend({ staffId: objectId });

export type CreateStaffBody = z.infer<typeof createStaffBody>;
export type UpdateStaffBody = z.infer<typeof updateStaffBody>;
