import { palette } from '@/theme';
import type { PaymentMethod } from './types';
import { toLocalCameroonNumber } from '@/lib/validation';

type MethodMeta = {
  badge: string;
  badgeBackground: string;
  badgeForeground: string;
  prefixesLabel: string;
  approveCode: string;
  matches: (localNumber: string) => boolean;
};

const startsWithAny = (value: string, prefixes: string[]) => prefixes.some((prefix) => value.startsWith(prefix));

export const paymentMethods: Record<PaymentMethod, MethodMeta> = {
  mtn: {
    badge: 'MoMo',
    badgeBackground: palette.mtn,
    badgeForeground: palette.violet950,
    prefixesLabel: '67, 68, 650–654',
    approveCode: '*126#',
    matches: (value) => startsWithAny(value, ['67', '68', '650', '651', '652', '653', '654']),
  },
  orange: {
    badge: 'OM',
    badgeBackground: palette.orangeMoney,
    badgeForeground: palette.white,
    prefixesLabel: '69, 655–659',
    approveCode: '#150*50#',
    matches: (value) => startsWithAny(value, ['69', '655', '656', '657', '658', '659']),
  },
};

export const PAYMENT_METHODS: PaymentMethod[] = ['mtn', 'orange'];

export function detectPaymentMethod(phone: string): PaymentMethod | undefined {
  const local = toLocalCameroonNumber(phone);
  return PAYMENT_METHODS.find((method) => paymentMethods[method].matches(local));
}

export const isNumberForMethod = (phone: string, method: PaymentMethod) =>
  paymentMethods[method].matches(toLocalCameroonNumber(phone));
