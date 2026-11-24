import { idParam, pageQuery } from '../schema/common.schema';
import * as s from '../schema/provider.schema';
import { ProviderEarnings, ProviderProfile, PublicProvider, ServiceItem } from './components';
import { route } from './registry';

const tag = 'Providers';
const provider = ['provider'];

route({
  method: 'post',
  path: '/providers/me',
  tag,
  summary: 'Create my business profile',
  description:
    'Upload each verification document first with POST /uploads/document and send the returned `publicId`s. The profile starts as `pending` and admins are notified (SRV-1).',
  roles: provider,
  body: s.createProviderBody.openapi('CreateProviderBody', {
    example: {
      businessName: 'Akwa Events Hire',
      description: 'Chairs, canopies and sound for events in Douala.',
      city: 'Douala',
      country: 'Cameroon',
      phone: '677123456',
      whatsapp: '690123456',
      documents: ['documents/niu_scan_x81kq'],
    },
  }),
  status: 201,
  response: ProviderProfile,
  errors: { 409: ['PROVIDER_EXISTS'] },
});

route({
  method: 'get',
  path: '/providers/me',
  tag,
  summary: 'Get my business profile',
  description: 'Shows the verification status and, when rejected, the reason. 404 means no profile yet: show the form.',
  roles: provider,
  response: ProviderProfile,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'patch',
  path: '/providers/me',
  tag,
  summary: 'Update my business profile',
  description:
    'Send only the fields to change. New `documents` (the full list) or any change to a rejected profile sends it back to `pending` for admin review.',
  roles: provider,
  body: s.updateProviderBody.openapi('UpdateProviderBody', { example: { whatsapp: '690123456' } }),
  response: ProviderProfile,
  errors: { 404: ['NOT_FOUND'] },
});

route({
  method: 'get',
  path: '/providers/me/services',
  tag,
  summary: 'List my services',
  description: 'Newest first. Deleted services are not included.',
  roles: provider,
  query: pageQuery,
  response: ServiceItem,
  paged: true,
});

route({
  method: 'get',
  path: '/providers/me/earnings',
  tag,
  summary: 'My earnings from paid bookings',
  description: 'Totals of successful booking payments, optionally between `from` and `to` (SRV-7).',
  roles: provider,
  query: s.earningsQuery,
  response: ProviderEarnings,
});

route({
  method: 'get',
  path: '/providers/{id}',
  tag,
  summary: 'Get a provider page',
  description: 'Verified providers only (404 otherwise), with phone, WhatsApp and active services (SRV-5).',
  access: 'public',
  params: idParam,
  response: PublicProvider,
  errors: { 404: ['NOT_FOUND'] },
});
