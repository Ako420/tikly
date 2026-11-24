import { z } from 'zod';
import { camPhone, eventIdParam, objectId, pageQuery } from './common.schema';

const MAX_AMOUNT = 1_000_000_000;

const text = (max: number, requiredKey: string, maxKey: string) =>
  z.string(requiredKey).trim().min(1, requiredKey).max(max, maxKey);

const optionalText = (max: number, maxKey: string) => z.string().trim().max(max, maxKey);

const amount = (requiredKey: string, minKey: string) =>
  z
    .number(requiredKey)
    .int('validation.common.amount.integer')
    .min(0, minKey)
    .max(MAX_AMOUNT, 'validation.common.amount.max');

const date = (key: string) => z.coerce.date(key);

const nonEmpty = <T extends Record<string, unknown>>(body: T) =>
  Object.values(body).some((value) => value !== undefined);

export const budgetItemParam = eventIdParam.extend({ itemId: objectId });
export const checklistItemParam = budgetItemParam;
export const agendaItemParam = budgetItemParam;
export const guestParam = eventIdParam.extend({ guestId: objectId });

const budgetLabel = text(150, 'validation.budgetItem.label.required', 'validation.budgetItem.label.maxLength');
const budgetCategory = text(60, 'validation.budgetItem.category.required', 'validation.budgetItem.category.maxLength');
const planned = amount('validation.budgetItem.planned.required', 'validation.budgetItem.planned.min');
const actual = amount('validation.budgetItem.actual.min', 'validation.budgetItem.actual.min');

export const createBudgetItemBody = z.object({
  label: budgetLabel,
  category: budgetCategory,
  planned,
  actual: actual.optional(),
  bookingId: objectId.optional(),
});

export const updateBudgetItemBody = z
  .object({
    label: budgetLabel.optional(),
    category: budgetCategory.optional(),
    planned: planned.optional(),
    actual: actual.optional(),
  })
  .refine(nonEmpty, 'validation.common.emptyUpdate');

const taskTitle = text(200, 'validation.checklistItem.title.required', 'validation.checklistItem.title.maxLength');

export const createChecklistItemBody = z.object({
  title: taskTitle,
  dueAt: date('validation.common.invalidValue').optional(),
});

export const updateChecklistItemBody = z
  .object({
    title: taskTitle.optional(),
    dueAt: date('validation.common.invalidValue').nullable().optional(),
    done: z.boolean('validation.common.invalidValue').optional(),
  })
  .refine(nonEmpty, 'validation.common.emptyUpdate');

const guestName = text(100, 'validation.guest.name.required', 'validation.guest.name.maxLength');
const guestCategory = text(
  40,
  'validation.guest.category.required',
  'validation.guest.category.maxLength',
).toLowerCase();
const guestEmail = z.string().trim().toLowerCase().pipe(z.email('validation.guest.email.invalid'));

export const listGuestsQuery = pageQuery.extend({
  q: z.string().trim().min(1).max(100).optional(),
  category: z.string().trim().toLowerCase().min(1).max(40).optional(),
});

export const createGuestBody = z.object({
  name: guestName,
  phone: camPhone.optional(),
  email: guestEmail.optional(),
  category: guestCategory,
});

export const updateGuestBody = z
  .object({
    name: guestName.optional(),
    phone: camPhone.nullable().optional(),
    email: guestEmail.nullable().optional(),
    category: guestCategory.optional(),
  })
  .refine(nonEmpty, 'validation.common.emptyUpdate');

const sessionTitle = text(150, 'validation.agendaItem.title.required', 'validation.agendaItem.title.maxLength');
const speaker = optionalText(100, 'validation.agendaItem.speaker.maxLength');
const location = optionalText(100, 'validation.agendaItem.location.maxLength');

export const createAgendaItemBody = z.object({
  title: sessionTitle,
  startAt: date('validation.agendaItem.startAt.required'),
  endAt: date('validation.agendaItem.endAt.required'),
  speaker: speaker.optional(),
  location: location.optional(),
});

export const updateAgendaItemBody = z
  .object({
    title: sessionTitle.optional(),
    startAt: date('validation.agendaItem.startAt.required').optional(),
    endAt: date('validation.agendaItem.endAt.required').optional(),
    speaker: speaker.nullable().optional(),
    location: location.nullable().optional(),
  })
  .refine(nonEmpty, 'validation.common.emptyUpdate');

export type CreateBudgetItemBody = z.infer<typeof createBudgetItemBody>;
export type UpdateBudgetItemBody = z.infer<typeof updateBudgetItemBody>;
export type CreateChecklistItemBody = z.infer<typeof createChecklistItemBody>;
export type UpdateChecklistItemBody = z.infer<typeof updateChecklistItemBody>;
export type ListGuestsQuery = z.infer<typeof listGuestsQuery>;
export type CreateGuestBody = z.infer<typeof createGuestBody>;
export type UpdateGuestBody = z.infer<typeof updateGuestBody>;
export type CreateAgendaItemBody = z.infer<typeof createAgendaItemBody>;
export type UpdateAgendaItemBody = z.infer<typeof updateAgendaItemBody>;
