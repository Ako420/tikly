import { z } from 'zod';
import { POST_TYPES } from '../types/enums';
import { eventIdParam, pageQuery } from './common.schema';

const MAX_IMAGES = 6;

const bilingual = (max: number, maxKey: string) =>
  z.object({
    en: z.string().trim().max(max, maxKey).optional(),
    fr: z.string().trim().max(max, maxKey).optional(),
  });
const hasText = (value: { en?: string; fr?: string }) => Boolean(value.en || value.fr);

const type = z.enum(POST_TYPES, 'validation.post.type.invalid');
const title = bilingual(150, 'validation.post.title.maxLength').refine(hasText, 'validation.post.title.required');
const body = bilingual(5000, 'validation.post.body.maxLength').refine(hasText, 'validation.post.body.required');
const images = z
  .array(z.url({ protocol: /^https?$/, error: 'validation.post.images.invalid' }))
  .max(MAX_IMAGES, 'validation.post.images.max');
const speaker = z.object({
  name: z
    .string('validation.post.speaker.name.required')
    .trim()
    .min(1, 'validation.post.speaker.name.required')
    .max(100, 'validation.post.speaker.name.maxLength'),
  role: z.string().trim().max(150, 'validation.post.speaker.role.maxLength').optional(),
  photoUrl: z.url({ protocol: /^https?$/, error: 'validation.post.speaker.photoUrl.invalid' }).optional(),
});

export const createPostBody = z
  .object({
    type,
    title,
    body,
    images: images.default([]),
    speaker: speaker.optional(),
    pinned: z.boolean().default(false),
    notify: z.boolean().default(false),
  })
  .refine((post) => post.type !== 'speaker' || post.speaker, {
    message: 'validation.post.speaker.required',
    path: ['speaker'],
  });

export const updatePostBody = z
  .object({
    type: type.optional(),
    title: title.optional(),
    body: body.optional(),
    images: images.optional(),
    speaker: speaker.nullable().optional(),
    pinned: z.boolean().optional(),
  })
  .refine((post) => Object.values(post).some((value) => value !== undefined), 'validation.common.emptyUpdate');

export const listPostsQuery = pageQuery.extend({ type: type.optional() });

export { eventIdParam };

export type CreatePostBody = z.infer<typeof createPostBody>;
export type UpdatePostBody = z.infer<typeof updatePostBody>;
export type ListPostsQuery = z.infer<typeof listPostsQuery>;
