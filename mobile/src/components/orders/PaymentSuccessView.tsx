import Ionicons from '@expo/vector-icons/Ionicons';
import { Linking, View, useWindowDimensions } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import type { EventDetails } from '@/features/events/types';
import { useEventFormatter } from '@/features/events/formatEvent';
import type { TicketOrder } from '@/features/orders/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { formatMoney } from '@/lib/money';
import { googleCalendarUrl } from '@/lib/share';
import { palette, useTheme } from '@/theme';
import { TicketPassCard } from './TicketPassCard';

const CONFETTI = [
  { left: -36, top: 6, rotate: '-20deg', color: palette.amber400, width: 10, height: 16 },
  { left: 88, top: -4, rotate: '24deg', color: palette.green400, width: 8, height: 16 },
  { left: 96, top: 44, rotate: '-12deg', color: palette.amber400, width: 12, height: 12 },
  { left: -24, top: 52, rotate: '0deg', color: palette.violet300, width: 8, height: 8 },
];

type PaymentSuccessViewProps = {
  order: TicketOrder;
  event: EventDetails;
  onViewTickets: () => void;
};

export function PaymentSuccessView({ order, event, onViewTickets }: PaymentSuccessViewProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const format = useEventFormatter();
  const tierLabel = t(`tickets.tiers.${order.tierName}`);
  const title = format.title(event);
  const meta = [format.dateTime(event), event.address.pin].filter(Boolean).join(' · ');

  return (
    <View className="flex-1 gap-5 px-6 pb-6 pt-4">
      <View className="items-center gap-3">
        <View className="h-[72px] w-[72px]">
          {CONFETTI.map((piece) => (
            <View
              key={`${piece.left}-${piece.top}`}
              className="absolute rounded-sm"
              style={{
                left: piece.left,
                top: piece.top,
                width: piece.width,
                height: piece.height,
                backgroundColor: piece.color,
                transform: [{ rotate: piece.rotate }],
              }}
            />
          ))}
          <View className="h-[72px] w-[72px] items-center justify-center rounded-full bg-valid">
            <Ionicons name="checkmark" size={36} color={palette.violet950} />
          </View>
        </View>
        <Text variant="display" className="text-center" accessibilityRole="header">
          {t('payments.success.title')}
        </Text>
        <Text tone="secondary" className="text-center">
          {t('payments.success.body', { count: order.quantity, tier: tierLabel })}
        </Text>
      </View>

      <TicketPassCard
        title={title}
        meta={meta}
        coverUrl={event.coverUrl}
        tierLabel={tierLabel}
        tickets={order.tickets}
        width={width - 48}
      />

      <Text variant="caption" tone="muted" className="text-center">
        {t('payments.success.paid', {
          amount: formatMoney(order.amount),
          method: t(`payments.methods.${order.method}`),
          reference: order.reference ?? order.id,
        })}
      </Text>

      <View className="mt-auto gap-4">
        <Button label={t('payments.success.viewTickets')} onPress={onViewTickets} />
        <View className="flex-row items-center justify-center gap-2">
          <Ionicons name="calendar" size={18} color={colors.accentText} />
          <Text
            variant="subheading"
            accessibilityRole="link"
            onPress={() =>
              Linking.openURL(googleCalendarUrl({ title, startAt: event.startAt, endAt: event.endAt, location: event.address.label }))
            }
          >
            {t('payments.success.addToCalendar')}
          </Text>
        </View>
      </View>
    </View>
  );
}
