import Ionicons from '@expo/vector-icons/Ionicons';
import { ActivityIndicator, View } from 'react-native';
import { PaymentMethodBadge } from '@/components/payments/PaymentMethodBadge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { paymentMethods } from '@/features/orders/paymentMethods';
import { RESERVATION_MINUTES, type TicketOrder } from '@/features/orders/types';
import { useCountdown } from '@/features/orders/useTicketOrder';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { toLocalCameroonNumber } from '@/lib/validation';
import { palette, useTheme } from '@/theme';

type PaymentPendingViewProps = {
  order: TicketOrder;
  verifying: boolean;
  onResend: () => void;
  onCancel: () => void;
};

const NBSP = String.fromCharCode(160);
const formatPhone = (phone: string) =>
  toLocalCameroonNumber(phone).replace(/^(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, ['$1', '$2', '$3', '$4', '$5'].join(NBSP));

function Step({ state, label }: { state: 'done' | 'active' | 'upcoming'; label: string }) {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-3">
      <View
        className={cn(
          'h-7 w-7 items-center justify-center rounded-full',
          state === 'done' && 'bg-valid',
          state === 'active' && 'border-2 border-accent-text/25',
          state === 'upcoming' && 'border border-border bg-surface-raised',
        )}
      >
        {state === 'done' ? <Ionicons name="checkmark" size={16} color={palette.violet950} /> : null}
        {state === 'active' ? <ActivityIndicator size={18} color={colors.accentText} /> : null}
        {state === 'upcoming' ? <Ionicons name="ticket-outline" size={14} color={colors.foregroundMuted} /> : null}
      </View>
      <Text variant={state === 'upcoming' ? 'body' : 'itemTitle'} tone={state === 'upcoming' ? 'muted' : 'primary'}>
        {label}
      </Text>
    </View>
  );
}

export function PaymentPendingView({ order, verifying, onResend, onCancel }: PaymentPendingViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const countdown = useCountdown(order.expiresAt);
  const methodShort = t(`payments.short.${order.method}`);
  const progress = Math.min(1, countdown.remainingMs / (RESERVATION_MINUTES * 60 * 1000));

  return (
    <View className="flex-1 gap-6 px-6 pb-6 pt-6">
      <View className="items-center">
        <View className="h-[180px] w-[180px] items-center justify-center rounded-full border border-border">
          <View className="h-[132px] w-[132px] items-center justify-center rounded-full border border-warning/40">
            <View className="h-24 w-24 items-center justify-center rounded-full bg-accent">
              <Ionicons name="phone-portrait-outline" size={44} color={colors.onAccent} />
            </View>
          </View>
          <View className="absolute bottom-7 right-3">
            <PaymentMethodBadge method={order.method} />
          </View>
        </View>
      </View>

      <View className="items-center gap-2">
        <Text variant="eyebrow" tone="accent">
          {t('payments.pending.eyebrow')}
        </Text>
        <Text variant="display" className="text-center" accessibilityRole="header">
          {t('payments.pending.title')}
        </Text>
        <Text tone="secondary" className="text-center">
          {t('payments.pending.body', {
            amount: formatMoney(order.amount),
            phone: `+237${NBSP}${formatPhone(order.phone)}`,
            method: methodShort,
          })}
        </Text>
      </View>

      <View className="gap-3 rounded-card border border-border bg-surface-raised p-4">
        <View className="flex-row items-center justify-between gap-3">
          <Text variant="bodySm" tone="secondary" className="flex-1">
            {t('payments.pending.held', { count: order.quantity, tier: t(`tickets.tiers.${order.tierName}`) })}
          </Text>
          <Text variant="amountLg" tone="accent" accessibilityLabel={t('payments.pending.timeLeft', { time: countdown.label })}>
            {countdown.label}
          </Text>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-background">
          <View className="h-full rounded-full bg-accent-text" style={{ width: `${progress * 100}%` }} />
        </View>
      </View>

      <View className="gap-3.5">
        <Step state="done" label={t('payments.pending.stepSent')} />
        <Step state="active" label={t('payments.pending.stepPin')} />
        <Step state="upcoming" label={t('payments.pending.stepTickets')} />
      </View>

      <View className="mt-auto gap-3">
        <Text variant="caption" tone="muted" className="text-center">
          {t('payments.pending.noPrompt')}
          <Text variant="label" tone="primary">
            {paymentMethods[order.method].approveCode}
          </Text>
          {t('payments.pending.noPromptEnd')}
        </Text>
        <Button label={t('payments.pending.resend')} variant="outline" onPress={onResend} loading={verifying} />
        <Text variant="link" tone="accent" className="text-center" accessibilityRole="button" onPress={onCancel}>
          {t('payments.pending.cancel')}
        </Text>
      </View>
    </View>
  );
}
