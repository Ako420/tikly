import { z } from 'zod';
import { UPLOAD_FOLDERS } from '../config/constants';
import { camPhone } from './common.schema';

const MAX_DOCUMENTS = 10;
const DOCUMENT_ID = new RegExp(`^${UPLOAD_FOLDERS.documents}/[A-Za-z0-9_-]{1,100}$`);

const text = (max: number, requiredKey: string, maxKey: string) =>
  z.string(requiredKey).trim().min(1, requiredKey).max(max, maxKey);

const businessName = z
  .string('validation.provider.businessName.required')
  .trim()
  .min(2, 'validation.provider.businessName.minLength')
  .max(150, 'validation.provider.businessName.maxLength');
const description = z.string().trim().max(2000, 'validation.provider.description.maxLength');
const city = text(100, 'validation.provider.city.required', 'validation.provider.city.maxLength');
const country = text(100, 'validation.provider.country.required', 'validation.provider.country.maxLength');
const documents = z
  .array(
    z.string().regex(DOCUMENT_ID, 'validation.provider.documents.invalid'),
    'validation.provider.documents.required',
  )
  .min(1, 'validation.provider.documents.required')
  .max(MAX_DOCUMENTS, 'validation.provider.documents.max')
  .transform((ids) => [...new Set(ids)]);

export const createProviderBody = z.object({
  businessName,
  description: description.optional(),
  city,
  country,
  phone: camPhone,
  whatsapp: camPhone.optional(),
  documents,
});

export const updateProviderBody = z
  .object({
    businessName: businessName.optional(),
    description: description.optional(),
    city: city.optional(),
    country: country.optional(),
    phone: camPhone.optional(),
    whatsapp: camPhone.optional(),
    documents: documents.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), 'validation.common.emptyUpdate');

const optionalDate = z.coerce.date('validation.common.invalidValue').optional();

export const earningsQuery = z
  .object({ from: optionalDate, to: optionalDate })
  .refine((query) => !query.from || !query.to || query.from <= query.to, 'validation.common.dateRange');

export type CreateProviderBody = z.infer<typeof createProviderBody>;
export type UpdateProviderBody = z.infer<typeof updateProviderBody>;
export type EarningsQuery = z.infer<typeof earningsQuery>;
