import type { IncomingHttpHeaders } from 'node:http';
import { getPaymentProvider } from '../lib/payment/provider';
import { logger } from '../lib/logger';
import { TransactionModel } from '../model';
import { adoptPayment, syncPayment } from './order.service';

export async function handleWebhook(providerName: string, body: unknown, headers: IncomingHttpHeaders) {
  const provider = getPaymentProvider();
  if (provider.name !== providerName) {
    logger.warn({ providerName }, 'Webhook for an inactive payment provider ignored');
    return;
  }
  const parsed = provider.parseWebhook(body, headers);
  if (!parsed) return;
  const transaction =
    (await TransactionModel.findOne({ externalRef: parsed.externalRef, kind: 'payment' })) ??
    (await adoptPayment(parsed.externalRef));
  if (!transaction || transaction.status !== 'pending') return;
  await syncPayment(String(transaction.orderId), transaction);
}
