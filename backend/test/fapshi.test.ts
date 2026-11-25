import { describe, expect, it } from 'vitest';
import { toFapshiPhone } from '../src/lib/payment/fapshi';
import { AppError } from '../src/util/AppError';
import { FAPSHI_URL, WEBHOOK_SECRET, fakeFapshi } from './helpers/fapshi';

describe('Fapshi provider', () => {
  it('sends a direct-pay prompt with the 9-digit phone, the order id and the API credentials', async () => {
    const fapshi = fakeFapshi();
    const { externalRef } = await fapshi.provider.collect({
      reference: '6743a1f2c9e77b0012ab34cd',
      amount: 30000,
      phone: '+237670000000',
      payerId: '6743a1f2c9e77b0012ab0001',
      description: '2 × VIP – Douala Jazz Night',
    });
    expect(externalRef).toBe('tx1');
    const [call] = fapshi.calls;
    expect(call).toMatchObject({ method: 'post', url: `${FAPSHI_URL}/direct-pay` });
    expect(call!.headers).toMatchObject({ apiuser: 'collect-user', apikey: 'collect-key' });
    expect(call!.body).toEqual({
      amount: 30000,
      phone: '670000000',
      externalId: '6743a1f2c9e77b0012ab34cd',
      userId: '6743a1f2c9e77b0012ab0001',
      message: '2 × VIP – Douala Jazz Night',
    });
  });

  it.each([
    ['CREATED', 'pending'],
    ['PENDING', 'pending'],
    ['SUCCESSFUL', 'successful'],
    ['FAILED', 'failed'],
    ['EXPIRED', 'failed'],
  ])('maps Fapshi status %s to %s', async (fapshiStatus, expected) => {
    const fapshi = fakeFapshi();
    const { externalRef } = await fapshi.provider.collect({
      reference: 'o1',
      payerId: 'buyer-1',
      amount: 100,
      phone: '670000000',
      description: 'x',
    });
    fapshi.setStatus(externalRef, fapshiStatus);
    expect(await fapshi.provider.getStatus(externalRef)).toBe(expected);
    expect(fapshi.callsTo('/payment-status')[0]!.method).toBe('get');
  });

  it('turns Fapshi errors into PAYMENT_PROVIDER_ERROR without leaking details', async () => {
    const fapshi = fakeFapshi();
    fapshi.failNext('/direct-pay', 403, 'Invalid API credentials');
    const error = await fapshi.provider
      .collect({ reference: 'o1', payerId: 'buyer-1', amount: 100, phone: '670000000', description: 'x' })
      .catch((err: unknown) => err);
    expect(error).toBeInstanceOf(AppError);
    expect(error).toMatchObject({ statusCode: 502, code: 'PAYMENT_PROVIDER_ERROR' });
  });

  it('accepts a webhook only with the shared secret, and reads the transaction id', () => {
    const { provider } = fakeFapshi();
    const body = { transId: 'tx9', status: 'SUCCESSFUL' };
    expect(provider.parseWebhook(body, { 'x-wh-secret': WEBHOOK_SECRET })).toEqual({ externalRef: 'tx9' });
    expect(provider.parseWebhook(body, { 'x-wh-secret': 'guess' })).toBeNull();
    expect(provider.parseWebhook(body, {})).toBeNull();
    expect(provider.parseWebhook({ status: 'SUCCESSFUL' }, { 'x-wh-secret': WEBHOOK_SECRET })).toBeNull();
  });

  it('pays out with the separate payout credentials', async () => {
    const fapshi = fakeFapshi();
    await fapshi.provider.disburse({ reference: 'refund-o1', amount: 5000, phone: '+237690000000' });
    const [call] = fapshi.callsTo('/payout');
    expect(call!.headers).toMatchObject({ apiuser: 'payout-user', apikey: 'payout-key' });
    expect(call!.body).toMatchObject({ amount: 5000, phone: '690000000', externalId: 'refund-o1' });
  });

  it('refuses payouts when no payout service is configured', async () => {
    const { provider } = fakeFapshi({ payouts: false });
    await expect(provider.disburse({ reference: 'r', amount: 100, phone: '670000000' })).rejects.toMatchObject({
      code: 'PAYOUTS_NOT_CONFIGURED',
    });
  });

  it('strips the country code and spaces from phones', () => {
    expect(toFapshiPhone('+237 670 00 00 00')).toBe('670000000');
    expect(toFapshiPhone('690000000')).toBe('690000000');
  });
});
