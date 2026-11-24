import { z } from 'zod';
import { SERVICE_CATEGORIES, SERVICE_UNITS } from '../types/enums';
import { pageQuery } from './common.schema';

const MAX_PRICE = 100_000_000;
const MAX_PHOTOS = 10;

const bilingualTitle = z.object({
  en: z.string().trim().max(150, 'validation.service.title.maxLength').optional(),
  fr: z.string().trim().max(150, 'validation.service.title.maxLength').optional(),
});
const hasText = (value: { en?: string; fr?: string }) => Boolean(value.en || value.fr);

const title = bilingualTitle.refine(hasText, 'validation.service.title.required');
const category = z.enum(SERVICE_CATEGORIES, 'validation.service.category.invalid');
const description = z.string().trim().max(2000, 'validation.service.description.maxLength');
const photos = z
  .array(z.url({ protocol: /^https?$/, error: 'validation.service.photos.invalid' }))
  .max(MAX_PHOTOS, 'validation.service.photos.max');
const city = z
  .string('validation.service.city.required')
  .trim()
  .min(1, 'validation.service.city.required')
  .max(100, 'validation.service.city.maxLength');
const price = z
  .number('validation.service.price.required')
  .int('validation.common.amount.integer')
  .min(0, 'validation.service.price.min')
  .max(MAX_PRICE, 'validation.common.amount.max');
const unit = z.enum(SERVICE_UNITS, 'validation.service.unit.invalid');

export const createServiceBody = z.object({
  category,
  title,
  description: description.optional(),
  photos: photos.default([]),
  city,
  price,
  unit,
});

export const updateServiceBody = z
  .object({
    category: category.optional(),
    title: title.optional(),
    description: description.optional(),
    photos: photos.optional(),
    city: city.optional(),
    price: price.optional(),
    unit: unit.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), 'validation.common.emptyUpdate');

const filter = z.string('validation.common.invalidValue').trim().min(1, 'validation.common.invalidValue').max(100);
const priceFilter = z.coerce.number('validation.common.invalidValue').int('validation.common.invalidValue').min(0);

export const listServicesQuery = pageQuery
  .extend({
    q: filter.optional(),
    category: category.optional(),
    city: filter.optional(),
    minPrice: priceFilter.optional(),
    maxPrice: priceFilter.optional(),
  })
  .refine(
    (query) => query.minPrice === undefined || query.maxPrice === undefined || query.minPrice <= query.maxPrice,
    'validation.service.priceRange.invalid',
  );

export type CreateServiceBody = z.infer<typeof createServiceBody>;
export type UpdateServiceBody = z.infer<typeof updateServiceBody>;
export type ListServicesQuery = z.infer<typeof listServicesQuery>;
