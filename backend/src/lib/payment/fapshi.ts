import { timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import axios, { type AxiosInstance, isAxiosError } from 'axios';
import { PAYMENT_HTTP_TIMEOUT_MS } from '../../config/constants';
import { AppError } from '../../util/AppError';
import { logger } from '../logger';
import { PaymentOutcomeUnknownError } from './errors';
import type { CollectInput, DisburseInput, PaymentProvider, PaymentStatus, ProviderPayment } from './provider';

type Credentials = { apiUser: string; apiKey: string };

export type FapshiConfig = Credentials & {
  baseURL: string;
  webhookSecret?: string;
  payout?: Credentials;
  http?: AxiosInstance;
};

type FapshiTransaction = {
  transId: string;
  status?: string;
  externalId?: string | null;
  userId?: string | null;
  amount?: number;
};

const STATUS: Record<string, PaymentStatus> = {
  CREATED: 'pending',
  PENDING: 'pending',
  SUCCESSFUL: 'successful',
  FAILED: 'failed',
  EXPIRED: 'failed',
};

const ID_PATTERN = /[^a-zA-Z0-9_-]/g;

export const toFapshiPhone = (phone: string) => phone.replace(/\D/g, '').slice(-9);
const safeId = (value: string) => value.replace(ID_PATTERN, '').slice(0, 100);

function toPayment(transaction: FapshiTransaction): ProviderPayment {
  return {
    externalRef: transaction.transId,
    status: STATUS[transaction.status ?? ''] ?? 'pending',
    reference: transaction.externalId ?? undefined,
    payerId: transaction.userId ?? undefined,
    amount: typeof transaction.amount === 'number' ? transaction.amount : undefined,
  };
}

function sameSecret(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createFapshiProvider(config: FapshiConfig): PaymentProvider {
  const http = config.http ?? axios.create({ timeout: PAYMENT_HTTP_TIMEOUT_MS });
  const headers = (credentials: Credentials) => ({ apiuser: credentials.apiUser, apikey: credentials.apiKey });

  async function call<T>(action: string, request: () => Promise<{ data: T }>): Promise<T> {
    try {
      return (await request()).data;
    } catch (err) {
      const status = isAxiosError(err) ? err.response?.status : undefined;
      const message = isAxiosError(err) ? (err.response?.data as { message?: string } | undefined)?.message : undefined;
      logger.error({ action, status, providerMessage: message ?? (err as Error).message }, 'Fapshi request failed');
      const rejected = status !== undefined && status >= 400 && status < 500 && status !== 429;
      if (rejected) throw new AppError(502, 'PAYMENT_PROVIDER_ERROR');
      throw new PaymentOutcomeUnknownError();
    }
  }

  return {
    name: 'fapshi',

    async collect(input: CollectInput) {
      const data = await call<FapshiTransaction>('direct-pay', () =>
        http.post(
          `${config.baseURL}/direct-pay`,
          {
            amount: input.amount,
            phone: toFapshiPhone(input.phone),
            externalId: safeId(input.reference),
            userId: safeId(input.payerId),
            message: input.description.slice(0, 200),
          },
          { headers: headers(config) },
        ),
      );
      if (!data.transId) throw new AppError(502, 'PAYMENT_PROVIDER_ERROR');
      return { externalRef: data.transId };
    },

    async getPayment(externalRef: string) {
      const data = await call<FapshiTransaction>('payment-status', () =>
        http.get(`${config.baseURL}/payment-status/${encodeURIComponent(externalRef)}`, { headers: headers(config) }),
      );
      return toPayment({ ...data, transId: data.transId || externalRef });
    },

    async getStatus(externalRef: string) {
      return (await this.getPayment(externalRef)).status;
    },

    async findPayment(payerId: string, reference: string) {
      const data = await call<FapshiTransaction[]>('transaction-by-user', () =>
        http.get(`${config.baseURL}/transaction/${encodeURIComponent(safeId(payerId))}`, { headers: headers(config) }),
      );
      const match = (Array.isArray(data) ? data : []).find(
        (transaction) => transaction.externalId === safeId(reference) && transaction.transId,
      );
      return match ? toPayment(match) : null;
    },

    parseWebhook(body: unknown, incoming: IncomingHttpHeaders) {
      if (config.webhookSecret) {
        const received = incoming['x-wh-secret'];
        if (typeof received !== 'string' || !sameSecret(received, config.webhookSecret)) {
          logger.warn('Fapshi webhook rejected: missing or wrong x-wh-secret');
          return null;
        }
      }
      const transId = (body as { transId?: unknown } | null)?.transId;
      return typeof transId === 'string' && transId.length > 0 ? { externalRef: transId } : null;
    },

    async disburse(input: DisburseInput) {
      if (!config.payout) throw new AppError(503, 'PAYOUTS_NOT_CONFIGURED');
      const payout = config.payout;
      const data = await call<FapshiTransaction>('payout', () =>
        http.post(
          `${config.baseURL}/payout`,
          {
            amount: input.amount,
            phone: toFapshiPhone(input.phone),
            externalId: safeId(input.reference),
            ...(input.description && { message: input.description.slice(0, 200) }),
          },
          { headers: headers(payout) },
        ),
      );
      if (!data.transId) throw new AppError(502, 'PAYMENT_PROVIDER_ERROR');
      return { externalRef: data.transId };
    },
  };
}
