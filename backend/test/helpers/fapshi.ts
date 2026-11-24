import axios, { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios';
import { createFapshiProvider } from '../../src/lib/payment/fapshi';

export type FapshiCall = {
  method: string;
  url: string;
  headers: Record<string, unknown>;
  body: Record<string, unknown>;
};

type Transaction = { transId: string; status: string; externalId?: string; userId?: string; amount?: number };
type Failure = { path: string; status: number; message: string; after?: boolean };

export const FAPSHI_URL = 'https://fapshi.test';
export const WEBHOOK_SECRET = 'tests-webhook-secret';

export function fakeFapshi(options: { payouts?: boolean } = {}) {
  const calls: FapshiCall[] = [];
  const transactions = new Map<string, Transaction>();
  const failures: Failure[] = [];
  let counter = 0;

  const reply = (config: InternalAxiosRequestConfig, status: number, data: unknown) => {
    const response = { data, status, statusText: String(status), headers: {}, config };
    if (status >= 400) {
      throw new AxiosError(`Request failed with status ${status}`, 'ERR_BAD_REQUEST', config, null, response);
    }
    return response;
  };

  const timeout = (config: InternalAxiosRequestConfig): never => {
    throw new AxiosError('timeout of 20000ms exceeded', 'ECONNABORTED', config);
  };

  const create = (prefix: string, body: Record<string, unknown>, status: string) => {
    counter += 1;
    const transId = `${prefix}${counter}`;
    transactions.set(transId, {
      transId,
      status,
      externalId: body.externalId as string | undefined,
      userId: body.userId as string | undefined,
      amount: body.amount as number | undefined,
    });
    return transId;
  };

  const http = axios.create({
    adapter: async (config) => {
      const url = config.url ?? '';
      const path = url.replace(FAPSHI_URL, '');
      const body = typeof config.data === 'string' ? (JSON.parse(config.data) as Record<string, unknown>) : {};
      calls.push({ method: config.method ?? 'get', url, headers: AxiosHeaders.from(config.headers).toJSON(), body });

      const index = failures.findIndex((f) => path.startsWith(f.path));
      const failure = index >= 0 ? failures.splice(index, 1)[0]! : undefined;
      if (failure && !failure.after) {
        if (failure.status === 0) return timeout(config);
        return reply(config, failure.status, { message: failure.message });
      }

      if (path === '/direct-pay' || path === '/payout') {
        const transId = create(path === '/payout' ? 'po' : 'tx', body, path === '/payout' ? 'SUCCESSFUL' : 'CREATED');
        if (failure?.after) return timeout(config);
        return reply(config, 200, { message: 'Request successful', transId, dateInitiated: new Date().toISOString() });
      }
      const status = path.match(/^\/payment-status\/(.+)$/);
      if (status) {
        const transaction = transactions.get(decodeURIComponent(status[1]!));
        if (!transaction) return reply(config, 404, { message: 'Transaction not found' });
        return reply(config, 200, transaction);
      }
      const byUser = path.match(/^\/transaction\/(.+)$/);
      if (byUser) {
        const userId = decodeURIComponent(byUser[1]!);
        return reply(
          config,
          200,
          [...transactions.values()].filter((transaction) => transaction.userId === userId),
        );
      }
      return reply(config, 404, { message: 'Unknown endpoint' });
    },
  });

  const provider = createFapshiProvider({
    baseURL: FAPSHI_URL,
    apiUser: 'collect-user',
    apiKey: 'collect-key',
    webhookSecret: WEBHOOK_SECRET,
    payout: options.payouts === false ? undefined : { apiUser: 'payout-user', apiKey: 'payout-key' },
    http,
  });

  return {
    provider,
    calls,
    setStatus: (transId: string, status: string) => {
      const transaction = transactions.get(transId) ?? { transId, status };
      transactions.set(transId, { ...transaction, status });
    },
    payment: (transId: string) => transactions.get(transId),
    createExternally: (body: { externalId: string; userId: string; amount: number }, status = 'CREATED') =>
      create('tx', body, status),
    failNext: (path: string, status = 400, message = 'Invalid phone number') =>
      failures.push({ path, status, message }),
    timeoutNext: (path: string) => failures.push({ path, status: 0, message: 'timeout' }),
    timeoutAfterCreating: (path: string) => failures.push({ path, status: 0, message: 'timeout', after: true }),
    lastTransId: () => `tx${counter}`,
    callsTo: (path: string) => calls.filter((call) => call.url.replace(FAPSHI_URL, '').startsWith(path)),
  };
}
