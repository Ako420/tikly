import { idParam } from '../schema/common.schema';
import * as s from '../schema/admin.schema';
import {
  AdminEvent,
  AdminProvider,
  AdminProviderDetail,
  AdminReview,
  AdminStats,
  Event,
  ProviderProfile,
  ServiceItem,
  Settings,
  User,
} from './components';
import { route } from './registry';

const tag = 'Admin';
const roles = ['admin'];

route({
  method: 'get',
  path: '/admin/events',
  tag,
  summary: 'Events by status',
  description:
    'Defaults to `pending`, oldest first so the queue is handled in order (ADM-1). Other statuses come newest first.',
  roles,
  query: s.adminEventsQuery,
  response: AdminEvent,
  paged: true,
});

route({
  method: 'post',
  path: '/admin/events/{id}/approve',
  tag,
  summary: 'Approve and publish an event',
  description: 'Only `pending` events. The organizer is notified (EVT-3).',
  roles,
  params: idParam,
  response: Event,
  errors: { 404: ['NOT_FOUND'], 409: ['EVENT_NOT_PENDING'] },
});

route({
  method: 'post',
  path: '/admin/events/{id}/reject',
  tag,
  summary: 'Reject an event',
  description: 'Only `pending` events. The reason is shown to the organizer, who can edit and resubmit (EVT-3).',
  roles,
  params: idParam,
  body: s.rejectEventBody.openapi('RejectEventBody', { example: { reason: 'Add the venue address.' } }),
  response: Event,
  errors: { 404: ['NOT_FOUND'], 409: ['EVENT_NOT_PENDING'] },
});

route({
  method: 'patch',
  path: '/admin/events/{id}/status',
  tag,
  summary: 'Suspend or restore an event',
  description:
    '`suspended` hides a published event and stops sales; `published` restores it. The organizer is told about a suspension (ADM-2).',
  roles,
  params: idParam,
  body: s.eventStatusBody.openapi('EventStatusBody', { example: { status: 'suspended' } }),
  response: Event,
  errors: { 404: ['NOT_FOUND'], 409: ['EVENT_STATUS_LOCKED'] },
});

route({
  method: 'get',
  path: '/admin/providers',
  tag,
  summary: 'Businesses by verification status',
  description: 'Defaults to `pending`, oldest first (ADM-1).',
  roles,
  query: s.adminProvidersQuery,
  response: AdminProvider,
  paged: true,
});

route({
  method: 'get',
  path: '/admin/providers/{id}',
  tag,
  summary: 'Business details with its documents',
  description: 'Each document has a signed link valid for 10 minutes. Fetch again for fresh links.',
  roles,
  params: idParam,
  response: AdminProviderDetail,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/admin/providers/{id}/verify',
  tag,
  summary: 'Verify a business',
  description:
    'From `pending` or `rejected`. Its services start appearing in listings and the provider is notified (SRV-2).',
  roles,
  params: idParam,
  response: ProviderProfile,
  errors: { 404: ['NOT_FOUND'], 409: ['PROVIDER_ALREADY_VERIFIED'] },
});

route({
  method: 'post',
  path: '/admin/providers/{id}/reject',
  tag,
  summary: 'Reject a business',
  description:
    'From `pending` or `verified` (a verified business disappears from listings). The reason is shown to the provider.',
  roles,
  params: idParam,
  body: s.rejectProviderBody.openapi('RejectProviderBody', { example: { reason: 'The ID scan is blurry.' } }),
  response: ProviderProfile,
  errors: { 404: ['NOT_FOUND'], 409: ['PROVIDER_ALREADY_REJECTED'] },
});

route({
  method: 'get',
  path: '/admin/users',
  tag,
  summary: 'Find users',
  description: '`q` matches part of the name, email or phone. Newest first.',
  roles,
  query: s.adminUsersQuery,
  response: User,
  paged: true,
});

route({
  method: 'patch',
  path: '/admin/users/{id}/status',
  tag,
  summary: 'Suspend or reactivate a user',
  description: 'A suspended user is signed out and every request returns 403 `ACCOUNT_SUSPENDED` (ADM-2).',
  roles,
  params: idParam,
  body: s.userStatusBody.openapi('UserStatusBody', { example: { status: 'suspended' } }),
  response: User,
  errors: { 404: ['NOT_FOUND'], 409: ['CANNOT_CHANGE_OWN_STATUS'] },
});

route({
  method: 'patch',
  path: '/admin/services/{id}/status',
  tag,
  summary: 'Hide or show a service listing',
  description: '`active: false` removes it from listings (ADM-2).',
  roles,
  params: idParam,
  body: s.serviceStatusBody.openapi('ServiceStatusBody', { example: { active: false } }),
  response: ServiceItem,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'patch',
  path: '/admin/reviews/{id}/hide',
  tag,
  summary: 'Hide or show a review',
  description: 'Hidden reviews leave public lists and the rating is recounted at once (REV-4).',
  roles,
  params: idParam,
  body: s.hideReviewBody.openapi('HideReviewBody', { example: { hidden: true } }),
  response: AdminReview,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'get',
  path: '/admin/stats',
  tag,
  summary: 'Dashboard totals',
  description:
    'Users per role and events per status are all-time. Tickets sold and money count only the `from`–`to` period when given. Commission is shown per stream (ADM-3).',
  roles,
  query: s.statsQuery,
  response: AdminStats,
});

route({
  method: 'get',
  path: '/admin/settings',
  tag,
  summary: 'Commission rates and categories',
  roles,
  response: Settings,
});

route({
  method: 'patch',
  path: '/admin/settings',
  tag,
  summary: 'Change commission rates or categories',
  description:
    'Rates are percents from 0 to 30 and apply to new payments only. `categories` replaces the whole list; events keep the category they already have (PAY-2, ADM-4).',
  roles,
  body: s.updateSettingsBody.openapi('UpdateSettingsBody', {
    example: {
      commission: { ticket: 8, service: 10, slot: 12 },
      categories: [
        { key: 'concert', en: 'Concert', fr: 'Concert' },
        { key: 'wedding-expo', en: 'Wedding expo', fr: 'Salon du mariage' },
      ],
    },
  }),
  response: Settings,
});
