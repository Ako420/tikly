import './openapi';
import { Types } from 'mongoose';
import { z } from 'zod';

const CAMEROON_MOBILE = /^(\+?237)?6\d{8}$/;

export const normalizePhone = (value: string) => {
  const compact = value.replace(/[\s.()-]/g, '');
  return CAMEROON_MOBILE.test(compact) ? `+237${compact.slice(-9)}` : compact;
};

export const objectId = z.string().refine((value) => Types.ObjectId.isValid(value), 'validation.common.invalidValue');
export const idParam = z.object({ id: objectId });
export const eventIdParam = z.object({ eventId: objectId });

export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const camPhone = z
  .string('validation.user.phone.required')
  .transform(normalizePhone)
  .pipe(z.string().regex(/^\+2376\d{8}$/, 'validation.user.phone.invalid'));
