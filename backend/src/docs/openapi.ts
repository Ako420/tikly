import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { API_PREFIX } from '../config/constants';
import { registry } from './registry';
import './health.docs';
import './auth.docs';
import './upload.docs';
import './event.docs';
import './tier.docs';
import './planning.docs';
import './order.docs';
import './payment.docs';
import './ticket.docs';
import './staff.docs';
import './access.docs';
import './provider.docs';
import './service.docs';
import './booking.docs';
import './slot.docs';
import './review.docs';
import './notification.docs';
import './admin.docs';

const DESCRIPTION = `
REST API shared by the Tikly web app (Next.js) and mobile app (Expo).

## Conventions
- **Base URL:** every path below starts with \`${API_PREFIX}\`.
- **Success:** \`{ "success": true, "data": … }\`. Lists add \`"meta": { page, limit, total, pages }\` and take \`page\` (from 1) and \`limit\` (1–100, default 20).
- **Errors:** \`{ "success": false, "error": { "code", "message", "details" } }\`. Branch on \`code\`; \`message\` is ready to show. \`VALIDATION_ERROR\` puts one \`{ code, message }\` per field in \`details\`.
- **Language:** messages follow the logged-in user's language, otherwise \`Accept-Language\` (\`en\` or \`fr\`).
- **Money:** whole francs CFA (XAF) as integers. Show as \`12 500 XAF\`.
- **Dates:** ISO 8601 in UTC. Format them in the user's language on the client.
- **Phones:** Cameroon mobiles in any format (\`677123456\`, \`+237 677 12 34 56\`); stored and returned as \`+2376XXXXXXXX\`.

## Auth
1. Get tokens from \`/auth/register\`, \`/auth/login\` or \`/auth/google\`.
2. Send \`Authorization: Bearer <accessToken>\`. It lasts 15 minutes.
3. On \`401 TOKEN_EXPIRED\`, call \`/auth/refresh\` with the refresh token and store **both** new tokens; the old refresh token stops working.
4. \`403 FORBIDDEN\` means the role is not allowed; \`403 ACCOUNT_SUSPENDED\` means log the user out.

Click **Authorize** above and paste an access token to try protected routes here.
`;

const TAGS = [
  'Health',
  'Auth',
  'Uploads',
  'Events',
  'Ticket tiers',
  'Planning: budget',
  'Planning: checklist',
  'Planning: guests',
  'Planning: agenda',
  'Orders',
  'Payments',
  'Tickets',
  'Staff',
  'Access control',
  'Providers',
  'Services',
  'Bookings',
  'Exhibitor slots',
  'Reviews',
  'Notifications',
  'Admin',
];

let document: ReturnType<OpenApiGeneratorV31['generateDocument']> | undefined;

export function openApiDocument() {
  document ??= new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: { title: 'Tikly API', version: '0.1.0', description: DESCRIPTION.trim() },
    servers: [{ url: API_PREFIX }],
    tags: TAGS.map((name) => ({ name })),
  });
  return document;
}
