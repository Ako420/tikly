import { z } from 'zod';
import { WebhookAck } from './components';
import { route } from './registry';

route({
  method: 'post',
  path: '/payments/webhook/{provider}',
  tag: 'Payments',
  summary: 'Payment provider webhook',
  description: [
    'Called by Fapshi when a payment becomes SUCCESSFUL, FAILED or EXPIRED. Not for apps.',
    'Configure `<API>/api/v1/payments/webhook/fapshi` as the webhook URL in the Fapshi dashboard, and set the same webhook secret there and in `FAPSHI_WEBHOOK_SECRET` (sent as `x-wh-secret`).',
    'Always answers 200 at once. The body is never trusted: the status is re-checked with Fapshi before any order changes, and repeated webhooks are ignored (PAY-4, REL-1).',
    'A payment the server never recorded (lost response, crash) is matched to its order through Fapshi’s own `externalId`, amount and payer, then settled.',
  ].join('\n\n'),
  access: 'public',
  params: z.object({ provider: z.string().openapi({ example: 'fapshi' }) }),
  body: z
    .object({ transId: z.string(), status: z.string() })
    .passthrough()
    .openapi('FapshiWebhook', {
      example: { transId: 'aBcD1234', status: 'SUCCESSFUL', externalId: '6743a1f2c9e77b0012ab34cd' },
    }),
  response: WebhookAck,
});
