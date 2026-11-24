import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EventLoadState } from '@/components/events/EventLoadState';
import { EventSummaryCard } from '@/components/events/EventSummaryCard';
import { PaymentMethodCard } from '@/components/payments/PaymentMethodCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { PhonePrefix } from '@/components/ui/PhonePrefix';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { useEventFormatter } from '@/features/events/formatEvent';
import { MAX_TICKETS_PER_ORDER } from '@/features/events/tierStock';
import { useEventDetails } from '@/features/events/useEvents';
import { createTicketOrder } from '@/features/orders/orderService';
import { detectPaymentMethod, isNumberForMethod, PAYMENT_METHODS } from '@/features/orders/paymentMethods';
import type { PaymentMethod } from '@/features/orders/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { formatDateRange } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { isCameroonMobile, toLocalCameroonNumber } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function Checkout() {
  const params = useLocalSearchParams<{ id: string; tier?: string; qty?: string; method?: string }>();
  const eventResource = useEventDetails(params.id);
  const event = eventResource.data;
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const format = useEventFormatter();
  const { user } = useAuth();
  const errorMessage = useApiErrorMessage();

  const initialPhone = toLocalCameroonNumber(user?.phone ?? '');
  const [phone, setPhone] = useState(initialPhone);
  const [method, setMethod] = useState<PaymentMethod>(
    params.method === 'orange' || params.method === 'mtn' ? params.method : detectPaymentMethod(initialPhone) ?? 'mtn',
  );
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string>();

  const tier = event?.tiers.find((item) => item.id === params.tier);
  const quantity = Math.min(Math.max(Number(params.qty) || 0, 0), MAX_TICKETS_PER_ORDER);

  if (!event) return <EventLoadState resource={eventResource} icon="ticket-outline" />;

  if (!tier || quantity < 1) {
    return (
      <Screen>
        <View className="flex-1 justify-center">
          <EmptyState
            icon="ticket-outline"
            title={t('checkout.invalidTitle')}
            body={t('checkout.invalidBody')}
            actionLabel={t('common.back')}
            onAction={() => router.back()}
          />
        </View>
      </Screen>
    );
  }

  const total = tier.price * quantity;
  const tierLabel = t(`tickets.tiers.${tier.name}`);
  const methodName = t(`payments.methods.${method}`);
  const phoneError = !isCameroonMobile(phone)
    ? t('auth.errors.phoneInvalid')
    : !isNumberForMethod(phone, method)
      ? t('checkout.wrongNetwork', { method: methodName })
      : undefined;
  const email = user?.email;

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/[^\d\s]/g, '');
    setPhone(cleaned);
    const detected = detectPaymentMethod(cleaned);
    if (detected && toLocalCameroonNumber(cleaned).length >= 3) setMethod(detected);
  };

  const handlePay = async () => {
    setSubmitted(true);
    setSubmitError(undefined);
    if (phoneError) return;
    setSubmitting(true);
    try {
      const order = await createTicketOrder({
        eventId: event.id,
        tierId: tier.id,
        quantity,
        phone,
        method,
        holderName: user?.name ?? '',
      });
      router.replace({ pathname: '/orders/[orderId]', params: { orderId: order.id } });
    } catch (caught) {
      setSubmitError(errorMessage(caught));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen edges={['top']}>
      <View className="h-[52px] flex-row items-center justify-between px-6">
        <IconButton
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
        />
        <Text variant="eyebrow" tone="accent">
          {t('checkout.step', { step: 2, total: 2 })}
        </Text>
        <View className="h-10 w-10" />
      </View>

      <KeyboardAvoidingView className="flex-1" behavior="padding">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerClassName="gap-5 px-6 pb-6 pt-1">
          <Text variant="headline" accessibilityRole="header">
            {t('checkout.title')}
          </Text>

          <EventSummaryCard
            title={format.title(event)}
            meta={`${formatDateRange(event.startAt, event.endAt, language, false)} · ${event.area}`}
            coverUrl={event.coverUrl}
          />

          <View className="gap-3">
            <View className="flex-row items-center justify-between gap-3">
              <Text variant="bodySm" tone="secondary" className="flex-1">
                {`${quantity} × ${tierLabel} · ${formatMoney(tier.price)}`}
              </Text>
              <Text variant="amount">{formatMoney(total)}</Text>
            </View>
            <View className="flex-row items-center justify-between gap-3">
              <Text variant="bodySm" tone="secondary">
                {t('checkout.bookingFee')}
              </Text>
              <Text variant="captionStrong" tone="valid">
                {t('events.free')}
              </Text>
            </View>
            <View className="h-px bg-border" />
            <View className="flex-row items-center justify-between gap-3">
              <Text variant="subheading">{t('checkout.total')}</Text>
              <Text variant="amountLg">{formatMoney(total)}</Text>
            </View>
          </View>

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
            textContentType="telephoneNumber"
            maxLength={12}
            returnKeyType="done"
          />

          {email ? (
            <View className="flex-row items-start gap-2.5">
              <Ionicons name="mail" size={18} color={colors.foregroundMuted} />
              <Text variant="bodySm" tone="secondary" className="flex-1">
                {t('checkout.deliveryTo')}
                {'\n'}
                <Text variant="link">{email}</Text>
              </Text>
            </View>
          ) : (
            <View className="flex-row items-start gap-2.5">
              <Ionicons name="phone-portrait-outline" size={18} color={colors.foregroundMuted} />
              <Text variant="bodySm" tone="secondary" className="flex-1">
                {t('checkout.deliveryInApp')}
              </Text>
            </View>
          )}

          {submitError ? (
            <Text variant="caption" tone="invalid">
              {submitError}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="gap-3 border-t border-border bg-surface-raised px-6 pt-3.5" style={{ paddingBottom: Math.max(insets.bottom, 16) + 4 }}>
        <Button label={t('checkout.pay', { amount: formatMoney(total) })} onPress={handlePay} loading={submitting} />
        <View className="flex-row items-center justify-center gap-1.5">
          <Ionicons name="lock-closed" size={12} color={colors.foregroundMuted} />
          <Text variant="captionSm" tone="muted">
            {t('checkout.secureNote')}
          </Text>
        </View>
      </View>
    </Screen>
  );
}
