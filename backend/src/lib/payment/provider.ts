import type { IncomingHttpHeaders } from 'node:http';
import { env } from '../../config/env';
import type { PaymentProviderName } from '../../types/enums';
import { createFapshiProvider } from './fapshi';

export type PaymentStatus = 'pending' | 'successful' | 'failed';

export type CollectInput = { reference: string; amount: number; phone: string; description: string; payerId: string };
export type DisburseInput = { reference: string; amount: number; phone: string; description?: string };

export type ProviderPayment = {
  externalRef: string;
  status: PaymentStatus;
  reference?: string;
  payerId?: string;
  amount?: number;
};

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  collect(input: CollectInput): Promise<{ externalRef: string }>;
  getStatus(externalRef: string): Promise<PaymentStatus>;
  getPayment(externalRef: string): Promise<ProviderPayment>;
  findPayment(payerId: string, reference: string): Promise<ProviderPayment | null>;
  parseWebhook(body: unknown, headers: IncomingHttpHeaders): { externalRef: string } | null;
  disburse(input: DisburseInput): Promise<{ externalRef: string }>;
}

let provider: PaymentProvider | undefined;

export function getPaymentProvider(): PaymentProvider {
  provider ??= createFapshiProvider({
    baseURL: env.PAYMENT_BASE_URL,
    apiUser: env.FAPSHI_API_USER,
    apiKey: env.FAPSHI_API_KEY,
    webhookSecret: env.FAPSHI_WEBHOOK_SECRET,
    payout:
      env.FAPSHI_PAYOUT_API_USER && env.FAPSHI_PAYOUT_API_KEY
        ? { apiUser: env.FAPSHI_PAYOUT_API_USER, apiKey: env.FAPSHI_PAYOUT_API_KEY }
        : undefined,
  });
  return provider;
}

export function setPaymentProvider(next: PaymentProvider | undefined) {
  provider = next;
}
