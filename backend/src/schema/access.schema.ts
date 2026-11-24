import { z } from 'zod';
import { camPhone, objectId } from './common.schema';

const ticketCode = z.string().trim().toUpperCase().min(3).max(30);

export const scanBody = z
  .object({
    eventId: objectId,
    qrToken: z.string().trim().min(1).max(200).optional(),
    code: ticketCode.optional(),
  })
  .refine((body) => Boolean(body.qrToken || body.code), 'validation.access.scan.required');

export const reentryBody = z.object({
  eventId: objectId,
  note: z.string().trim().max(300, 'validation.ticket.checkIns.note.maxLength').optional(),
});

export const lookupQuery = z
  .object({
    eventId: objectId,
    code: ticketCode.optional(),
    phone: camPhone.optional(),
  })
  .refine((query) => Boolean(query.code || query.phone), 'validation.access.lookup.required');

export type ScanBody = z.infer<typeof scanBody>;
export type ReentryBody = z.infer<typeof reentryBody>;
export type LookupQuery = z.infer<typeof lookupQuery>;
