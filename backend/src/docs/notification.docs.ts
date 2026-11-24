import { z } from 'zod';
import { idParam, pageQuery } from '../schema/common.schema';
import { NotificationPageMeta, NotificationView } from './components';
import { route } from './registry';

const tag = 'Notifications';

route({
  method: 'get',
  path: '/me/notifications',
  tag,
  summary: 'My notifications',
  description: [
    'Newest first, with `title` and `body` in my language (NOT-4). `meta.unread` is the badge count.',
    'Each notification is also sent as an Expo push to the devices registered with POST /auth/me/push-tokens and, for most types, by email (NOT-1). The push `data` matches `data` here.',
    'Event reminders go out 24 hours before the start, once per ticket holder (NOT-2, NOT-3).',
  ].join('\n\n'),
  query: pageQuery,
  response: NotificationView,
  paged: true,
  pageMeta: NotificationPageMeta,
});

route({
  method: 'patch',
  path: '/me/notifications/read-all',
  tag,
  summary: 'Mark all my notifications as read',
  response: z.object({ updated: z.number().int().openapi({ example: 3 }) }),
});

route({
  method: 'patch',
  path: '/me/notifications/{id}/read',
  tag,
  summary: 'Mark one notification as read',
  params: idParam,
  response: z.object({ id: z.string(), read: z.literal(true), readAt: z.iso.datetime() }),
  errors: { 404: ['NOT_FOUND'] },
});
