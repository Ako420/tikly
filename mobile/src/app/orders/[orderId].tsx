import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { PaymentFailedView } from '@/components/orders/PaymentFailedView';
import { PaymentPendingView } from '@/components/orders/PaymentPendingView';
import { PaymentSuccessView } from '@/components/orders/PaymentSuccessView';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { sampleUser } from '@/features/events/sampleEvents';
import { useEventDetails } from '@/features/events/useEvents';
import { createTicketOrder } from '@/features/orders/orderService';
import type { PaymentMethod } from '@/features/orders/types';
import { useTicketOrder } from '@/features/orders/useTicketOrder';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { useTheme } from '@/theme';

export default function OrderStatus() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const { order, error, verify, verifying } = useTicketOrder(orderId);
  const event = useEventDetails(order?.eventId);
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const errorMessage = useApiErrorMessage();
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string>();

  const backToEvent = () => {
    if (!order) return router.back();
    router.dismissTo({ pathname: '/events/[id]', params: { id: order.eventId } });
  };

  const retry = async () => {
    if (!order) return;
    setRetrying(true);
    setRetryError(undefined);
    try {
      const next = await createTicketOrder({
        eventId: order.eventId,
        tierId: order.tierId,
        quantity: order.quantity,
        phone: order.phone,
        method: order.method,
        holderName: user?.name ?? sampleUser.name,
      });
      router.replace({ pathname: '/orders/[orderId]', params: { orderId: next.id } });
    } catch (caught) {
      setRetryError(errorMessage(caught));
    } finally {
      setRetrying(false);
    }
  };

  const switchMethod = (method: PaymentMethod) => {
    if (!order) return;
    router.replace({
      pathname: '/events/[id]/checkout',
      params: { id: order.eventId, tier: order.tierId, qty: String(order.quantity), method },
    });
  };

  if (error && !order) {
    return (
      <Screen>
        <View className="flex-1 justify-center">
          <EmptyState icon="alert-circle-outline" title={t('payments.notFoundTitle')} body={errorMessage(error)} actionLabel={t('common.back')} onAction={() => router.back()} />
        </View>
      </Screen>
    );
  }

  if (!order || !event) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accentText} size="large" />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerClassName="grow" showsVerticalScrollIndicator={false}>
        {order.status === 'pending' ? (
          <PaymentPendingView order={order} verifying={verifying} onResend={verify} onCancel={backToEvent} />
        ) : order.status === 'paid' ? (
          <PaymentSuccessView order={order} event={event} onViewTickets={() => router.dismissTo('/tickets')} />
        ) : (
          <PaymentFailedView
            order={order}
            event={event}
            retrying={retrying}
            onRetry={retry}
            onSwitchMethod={switchMethod}
            onBackToEvent={backToEvent}
          />
        )}
        {retryError ? (
          <View className="px-6 pb-4">
            <EmptyState icon="alert-circle-outline" title={t('payments.retryFailed')} body={retryError} />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
