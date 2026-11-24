import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { PaymentMethodCard } from '@/components/payments/PaymentMethodCard';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { PhonePrefix } from '@/components/ui/PhonePrefix';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { homeRouteFor } from '@/features/auth/homeRoute';
import { ordersApi, type ApiOrder } from '@/features/orders/api';
import { detectPaymentMethod, isNumberForMethod, PAYMENT_METHODS, paymentMethods } from '@/features/orders/paymentMethods';
import { createPayOrder, type PayKind } from '@/features/orders/payOrders';
import { ORDER_POLL_INTERVAL_MS, type PaymentMethod } from '@/features/orders/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { isCameroonMobile, toLocalCameroonNumber } from '@/lib/validation';
import { useTheme } from '@/theme';

type Params = { kind: PayKind; ref: string; qty?: string; amount: string; title: string; subtitle?: string };

export default function Pay() {
  const params = useLocalSearchParams<Params>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const errorMessage = useApiErrorMessage();
  const initialPhone = toLocalCameroonNumber(user?.phone ?? '');
  const [phone, setPhone] = useState(initialPhone);
  const [method, setMethod] = useState<PaymentMethod>(detectPaymentMethod(initialPhone) ?? 'mtn');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();
  const [order, setOrder] = useState<ApiOrder>();
  const [verifying, setVerifying] = useState(false);

  const amount = Number(params.amount) || 0;
  const quantity = Math.max(1, Number(params.qty) || 1);
  const methodName = t(`payments.methods.${method}`);
  const phoneError = !isCameroonMobile(phone)
    ? t('auth.errors.phoneInvalid')
    : !isNumberForMethod(phone, method)
      ? t('checkout.wrongNetwork', { method: methodName })
      : undefined;
  const status = order?.status;
  const done = () => router.dismissTo(homeRouteFor(user) as '/home');

  const refresh = useCallback(async () => {
    if (!order) return;
    try {
      setOrder(await ordersApi.getOrder(order.id));
    } catch {}
  }, [order]);

  useEffect(() => {
    if (status !== 'pending') return;
    const timer = setInterval(refresh, ORDER_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status, refresh]);

  const verify = async () => {
    if (!order) return;
    setVerifying(true);
    try {
      setOrder(await ordersApi.verifyOrder(order.id));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setVerifying(false);
    }
  };

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^\d\s]/g, '');
    setPhone(cleaned);
    const detected = detectPaymentMethod(cleaned);
    if (detected && toLocalCameroonNumber(cleaned).length >= 3) setMethod(detected);
  };

  const submit = async () => {
    setSubmitted(true);
    setError(undefined);
    if (phoneError) return;
    setSubmitting(true);
    try {
      setOrder(await createPayOrder(params.kind, params.ref, quantity, phone));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  const summary = (
    <View className="gap-1 rounded-2xl border border-border bg-surface-raised p-4">
      <Text variant="subheading">{params.title}</Text>
      {params.subtitle ? (
        <Text variant="caption" tone="muted">
          {params.subtitle}
        </Text>
      ) : null}
      <View className="mt-2 flex-row items-center justify-between">
        <Text variant="bodySm" tone="secondary">
          {t('checkout.total')}
        </Text>
        <Text variant="amountLg">{formatMoney(order?.amount ?? amount)}</Text>
      </View>
    </View>
  );

  if (status === 'paid' || status === 'failed' || status === 'expired' || status === 'refunded') {
    const paid = status === 'paid';
    return (
      <Screen>
        <View className="flex-1 justify-center gap-6 px-6">
          <View className="items-center gap-3">
            <Ionicons name={paid ? 'checkmark-circle' : 'close-circle'} size={72} color={paid ? colors.valid : colors.invalid} />
            <Text variant="headline" className="text-center">
              {t(paid ? 'pay.paidTitle' : 'pay.failedTitle')}
            </Text>
            <Text tone="secondary" className="text-center">
              {t(paid ? `pay.paidBody.${params.kind}` : 'pay.failedBody')}
            </Text>
          </View>
          {summary}
          {paid ? (
            <Button label={t('pay.done')} onPress={done} />
          ) : (
            <View className="gap-2.5">
              <Button label={t('pay.tryAgain')} onPress={() => setOrder(undefined)} />
              <Button variant="outline" label={t('common.back')} onPress={() => router.back()} />
            </View>
          )}
        </View>
      </Screen>
    );
  }

  if (status === 'pending') {
    return (
      <Screen>
        <View className="flex-1 justify-center gap-6 px-6">
          <View className="items-center gap-3">
            <ActivityIndicator size="large" color={colors.accentText} />
            <Text variant="headline" className="text-center">
              {t('pay.pendingTitle')}
            </Text>
            <Text tone="secondary" className="text-center">
              {t('pay.pendingBody', { method: methodName, code: paymentMethods[method].approveCode })}
            </Text>
          </View>
          {summary}
          {error ? (
            <Text variant="bodySm" tone="invalid">
              {error}
            </Text>
          ) : null}
          <Button variant="outline" label={t('pay.checkNow')} loading={verifying} onPress={verify} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View className="h-[52px] flex-row items-center px-6">
        <IconButton
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
        />
      </View>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-6 pb-6 pt-1">
          <Text variant="headline" accessibilityRole="header">
            {t('pay.title')}
          </Text>
          {summary}
          <View className="gap-3">
            <Text variant="eyebrow" tone="accent">
              {t('checkout.payWith')}
            </Text>
            <View accessibilityRole="radiogroup" className="flex-row gap-3">
              {PAYMENT_METHODS.map((option) => (
                <PaymentMethodCard key={option} method={option} selected={method === option} onPress={() => setMethod(option)} />
              ))}
            </View>
          </View>
          <TextField
            label={t('checkout.numberToCharge', { method: t(`payments.short.${method}`) })}
            value={phone}
            onChangeText={handlePhoneChange}
            prefix={<PhonePrefix showCountry={false} />}
            error={submitted ? phoneError : undefined}
            keyboardType="phone-pad"
            autoComplete="tel"
            maxLength={12}
          />
          {error ? (
            <Text variant="bodySm" tone="invalid" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <View className="px-6 pb-4 pt-2">
        <Button label={t('pay.payAmount', { amount: formatMoney(amount) })} loading={submitting} onPress={submit} />
      </View>
    </Screen>
  );
}
