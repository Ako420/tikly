import { idParam } from '../schema/common.schema';
import * as s from '../schema/service.schema';
import { Empty, ServiceDetail, ServiceItem, ServiceListItem } from './components';
import { route } from './registry';

const tag = 'Services';
const owner = ['provider (owner)'];

route({
  method: 'get',
  path: '/services',
  tag,
  summary: 'Browse services',
  description:
    'Active services of verified providers, newest first. `q` searches titles and descriptions by whole words; `city` ignores case; prices are in XAF (SRV-4).',
  access: 'public',
  query: s.listServicesQuery,
  response: ServiceListItem,
  paged: true,
});

route({
  method: 'get',
  path: '/services/{id}',
  tag,
  summary: 'Get a service',
  description:
    'Includes the provider’s phone and WhatsApp. Deleted services and services of unverified providers are visible to their owner and admins only (404 otherwise).',
  access: 'optional',
  params: idParam,
  response: ServiceDetail,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'post',
  path: '/services',
  tag,
  summary: 'List a new service',
  description: 'Only once an admin has verified your business. Upload photos first with POST /uploads/image (SRV-3).',
  roles: ['provider (verified)'],
  body: s.createServiceBody.openapi('CreateServiceBody', {
    example: {
      category: 'canopy',
      title: { en: 'Canopy 5×10 m with setup', fr: 'Bâche 5×10 m avec montage' },
      description: 'White canopy, delivered and set up the day before.',
      photos: ['https://res.cloudinary.com/demo/image/upload/services/c1.jpg'],
      city: 'Douala',
      price: 25000,
      unit: 'per_day',
    },
  }),
  status: 201,
  response: ServiceItem,
  errors: { 403: ['PROVIDER_NOT_VERIFIED'] },
});

route({
  method: 'patch',
  path: '/services/{id}',
  tag,
  summary: 'Update a service',
  description: 'Send only the fields to change. `title` and `photos` replace the whole value.',
  roles: owner,
  params: idParam,
  body: s.updateServiceBody.openapi('UpdateServiceBody', { example: { price: 30000 } }),
  response: ServiceItem,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'delete',
  path: '/services/{id}',
  tag,
  summary: 'Delete a service',
  description: 'Soft delete: the service leaves listings; past bookings keep it.',
  roles: owner,
  params: idParam,
  response: Empty,
  errors: { 404: ['NOT_FOUND'] },
});
