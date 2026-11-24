import { idParam } from '../schema/common.schema';
import * as s from '../schema/post.schema';
import { CreatedPost, Empty, PostView } from './components';
import { route } from './registry';

const tag = 'Event posts';
const owner = ['organizer (owner)', 'admin'];

route({
  method: 'get',
  path: '/events/{eventId}/posts',
  tag,
  summary: 'An event’s posts',
  description:
    'News, speaker introductions and promotions for the event page. Pinned first, then newest. Public once the event is published; the owner and admins also see posts on drafts.',
  access: 'optional',
  params: s.eventIdParam,
  query: s.listPostsQuery,
  response: PostView,
  paged: true,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/events/{eventId}/posts',
  tag,
  summary: 'Publish a post about my event',
  description: [
    'Write it in English, French or both, and add up to 6 images uploaded with POST /uploads/image. A `speaker` post needs `speaker.name`.',
    'Posts can be prepared on a draft event and appear when it is published.',
    '`notify: true` also sends a push and email to every ticket holder, only on published events and at most 3 times a day per event.',
  ].join('\n\n'),
  roles: ['organizer (owner)'],
  params: s.eventIdParam,
  body: s.createPostBody.openapi('CreatePostBody', {
    example: {
      type: 'speaker',
      title: { en: 'Meet our headliner', fr: 'Découvrez notre tête d’affiche' },
      body: { en: 'Charlotte Dipanda closes the night.', fr: 'Charlotte Dipanda clôture la soirée.' },
      images: [],
      speaker: { name: 'Charlotte Dipanda', role: 'Singer-songwriter' },
      pinned: true,
      notify: true,
    },
  }),
  status: 201,
  response: CreatedPost,
  errors: { 409: ['EVENT_NOT_EDITABLE', 'POST_NOTIFY_NOT_PUBLISHED'], 429: ['POST_NOTIFY_LIMIT'] },
});

route({
  method: 'patch',
  path: '/posts/{id}',
  tag,
  summary: 'Edit a post',
  description:
    'Send only what changes. `title`, `body` and `images` replace the whole value; `speaker: null` removes it. Editing never notifies again.',
  roles: owner,
  params: idParam,
  body: s.updatePostBody.openapi('UpdatePostBody', { example: { pinned: false } }),
  response: PostView,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'delete',
  path: '/posts/{id}',
  tag,
  summary: 'Delete a post',
  roles: owner,
  params: idParam,
  response: Empty,
  errors: { 404: ['NOT_FOUND'] },
});
