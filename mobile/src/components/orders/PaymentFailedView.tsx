import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { EventSummaryCard } from '@/components/events/EventSummaryCard';
import { PaymentMethodBadge } from '@/components/payments/PaymentMethodBadge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useEventFormatter } from '@/features/events/formatEvent';
import { getTierStock } from '@/features/events/tierStock';
import type { EventDetails } from '@/features/events/types';
import type { PaymentMethod, TicketOrder } from '@/features/orders/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { formatMoney } from '@/lib/money';
import { palette, useTheme } from '@/theme';

type PaymentFailedViewProps = {
  order: TicketOrder;
  event: EventDetails;
  retrying: boolean;
  onRetry: () => void;
  onSwitchMethod: (method: PaymentMethod) => void;
  onBackToEvent: () => void;
};

export function PaymentFailedView({ order, event, retrying, onRetry, onSwitchMethod, onBackToEvent }: PaymentFailedViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useEventFormatter();
  const tier = event.tiers.find((item) => item.id === order.tierId);
  const stock = tier ? getTierStock(tier) : undefined;
  const tierLabel = t(`tickets.tiers.${order.tierName}`);
  const otherMethod: PaymentMethod = order.method === 'mtn' ? 'orange' : 'mtn';

  return (
    <View className="flex-1 gap-6 px-6 pb-6 pt-10">
      <View className="items-center gap-3">
        <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-invalid">
          <Ionicons name="close" size={44} color={palette.violet950} />
        </View>
        <Text variant="eyebrow" tone="invalid">
          {t('payments.failed.eyebrow')}
        </Text>
        <Text variant="display" className="text-center" accessibilityRole="header">
          {t('payments.failed.title')}
        </Text>
        <Text tone="secondary" className="text-center">
          {t(order.status === 'expired' ? 'payments.failed.expiredBody' : 'payments.failed.declinedBody')}
        </Text>
      </View>

      <EventSummaryCard
        title={format.title(event)}
        meta={`${order.quantity} × ${tierLabel} · ${formatMoney(order.amount)}`}
        coverUrl={event.coverUrl}
        className="p-3.5"
      >
        {stock?.available && stock.key === 'onlyLeft' && tier ? (
          <View className="flex-row items-start gap-2.5 rounded-xl bg-background p-3">
            <Ionicons name="time" size={18} color={colors.warning} />
            <Text variant="caption" tone="secondary" className="flex-1">
              {t('payments.failed.sellingFast', { tier: tierLabel, count: tier.remaining })}
            </Text>
          </View>
        ) : null}
      </EventSummaryCard>

      <View className="mt-auto gap-3">
        {stock?.available ? (
          <>
            <Button
              label={t('payments.failed.retry', { method: t(`payments.short.${order.method}`) })}
              onPress={onRetry}
              loading={retrying}
            />
            <Button
              variant="outline"
              label={t('payments.failed.switch', { method: t(`payments.methods.${otherMethod}`) })}
              icon={<PaymentMethodBadge method={otherMethod} />}
              onPress={() => onSwitchMethod(otherMethod)}
            />
          </>
        ) : null}
        <Text variant="link" tone="accent" className="text-center" accessibilityRole="button" onPress={onBackToEvent}>
          {t('payments.failed.backToEvent')}
        </Text>
      </View>
    </View>
  );
}
