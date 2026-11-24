import { z } from 'zod';
import { EVENT_STATUSES } from '../types/enums';
import { pageQuery } from './common.schema';

const text = (max: number, requiredKey: string, maxKey: string) =>
  z.string(requiredKey).trim().min(1, requiredKey).max(max, maxKey);

const bilingual = (max: number, maxKey: string) =>
  z.object({
    en: z.string().trim().max(max, maxKey).optional(),
    fr: z.string().trim().max(max, maxKey).optional(),
  });

const hasText = (value: { en?: string; fr?: string }) => Boolean(value.en || value.fr);

const title = bilingual(150, 'validation.event.title.maxLength');
const description = bilingual(5000, 'validation.event.description.maxLength');
const category = text(50, 'validation.event.category.required', 'validation.event.category.required').toLowerCase();
const coverUrl = z.url({ protocol: /^https?$/, error: 'validation.event.coverUrl.invalid' });
const venue = text(200, 'validation.event.venue.required', 'validation.event.venue.maxLength');
const city = text(100, 'validation.event.city.required', 'validation.event.city.maxLength');
const country = text(100, 'validation.event.country.required', 'validation.event.country.maxLength');
const startAt = z.coerce.date('validation.event.startAt.required');
const endAt = z.coerce.date('validation.event.endAt.required');

export const createEventBody = z.object({
  title: title.refine(hasText, 'validation.event.title.required'),
  description: description.refine(hasText, 'validation.event.description.required'),
  category,
  coverUrl: coverUrl.optional(),
  venue,
  city,
  country,
  startAt,
  endAt,
});

export const updateEventBody = z
  .object({
    title: title.optional(),
    description: description.optional(),
    category: category.optional(),
    coverUrl: coverUrl.optional(),
    venue: venue.optional(),
    city: city.optional(),
    country: country.optional(),
    startAt: startAt.optional(),
    endAt: endAt.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), 'validation.common.emptyUpdate');

const filter = z.string('validation.common.invalidValue').trim().min(1, 'validation.common.invalidValue').max(100);
const optionalDate = z.coerce.date('validation.common.invalidValue').optional();

export const listEventsQuery = pageQuery.extend({
  q: filter.optional(),
  city: filter.optional(),
  country: filter.optional(),
  category: filter.toLowerCase().optional(),
  from: optionalDate,
  to: optionalDate,
});

export const organizerEventsQuery = pageQuery.extend({
  status: z.enum(EVENT_STATUSES, 'validation.event.status.invalid').optional(),
});

export const cancelEventBody = z.object({
  reason: text(500, 'validation.event.cancellationReason.required', 'validation.event.cancellationReason.maxLength'),
});

export type CreateEventBody = z.infer<typeof createEventBody>;
export type UpdateEventBody = z.infer<typeof updateEventBody>;
export type ListEventsQuery = z.infer<typeof listEventsQuery>;
export type OrganizerEventsQuery = z.infer<typeof organizerEventsQuery>;
export type CancelEventBody = z.infer<typeof cancelEventBody>;
