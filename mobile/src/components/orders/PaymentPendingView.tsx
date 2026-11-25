import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { PaymentMethodBadge } from '@/components/payments/PaymentMethodBadge';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { paymentMethods } from '@/features/orders/paymentMethods';
import { RESERVATION_MINUTES, type TicketOrder } from '@/features/orders/types';
import { useCountdown } from '@/features/orders/useTicketOrder';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { EASE_OUT } from '@/lib/motion';
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

const URGENT_MS = 60 * 1000;

function WaitingRing() {
  const reduceMotion = useReducedMotion();
  const wave = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    wave.value = withRepeat(withTiming(1, { duration: 1800, easing: EASE_OUT }), -1, false);
  }, [reduceMotion, wave]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.7 * (1 - wave.value),
    transform: [{ scale: 0.75 + wave.value * 0.6 }],
  }));

  return <Animated.View pointerEvents="none" className="absolute h-[132px] w-[132px] rounded-full border-2 border-warning" style={style} />;
}

function useTimerPulse(urgent: boolean) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);

  useEffect(() => {
    if (urgent && !reduceMotion) {
      scale.value = withRepeat(withSequence(withTiming(1.08, { duration: 420 }), withTiming(1, { duration: 580 })), -1, false);
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(1, { duration: 120 });
    }
  }, [urgent, reduceMotion, scale]);

  return useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
}

function ProgressFill({ progress }: { progress: number }) {
  const width = useSharedValue(progress);

  useEffect(() => {
    width.value = withTiming(progress, { duration: 1000, easing: Easing.linear });
  }, [progress, width]);

  const style = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  return <Animated.View className="h-full rounded-full bg-accent-text" style={style} />;
}

export function PaymentPendingView({ order, verifying, onResend, onCancel }: PaymentPendingViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const countdown = useCountdown(order.expiresAt);
  const methodShort = t(`payments.short.${order.method}`);
  const progress = Math.min(1, countdown.remainingMs / (RESERVATION_MINUTES * 60 * 1000));
  const timerStyle = useTimerPulse(countdown.remainingMs > 0 && countdown.remainingMs <= URGENT_MS);

  return (
    <View className="flex-1 gap-6 px-6 pb-6 pt-6">
      <View className="items-center">
        <View className="h-[180px] w-[180px] items-center justify-center rounded-full border border-border">
          <WaitingRing />
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
          <Animated.View style={timerStyle}>
            <Text variant="amountLg" tone="accent" accessibilityLabel={t('payments.pending.timeLeft', { time: countdown.label })}>
              {countdown.label}
            </Text>
          </Animated.View>
        </View>
        <View className="h-2 overflow-hidden rounded-full bg-background">
          <ProgressFill progress={progress} />
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
