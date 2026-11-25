import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, Pressable, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useTicketFormatter } from '@/features/tickets/formatTicket';
import { isCancelledBundle, type TicketBundle } from '@/features/tickets/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { formatDateRange, formatTime } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { palette, useTheme } from '@/theme';

const MAX_RATING = 5;

type PastTicketCardProps = {
  bundle: TicketBundle;
  onOpen: () => void;
  onRate: () => void;
};

export function PastTicketCard({ bundle, onOpen, onRate }: PastTicketCardProps) {
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const format = useTicketFormatter();
  const cancelled = isCancelledBundle(bundle);
  const canRate = !cancelled && !!bundle.checkedInAt && !bundle.review;
  const date = formatDateRange(bundle.event.startAt, bundle.event.startAt, language, false).replace(/\./g, '');
  const title = format.title(bundle);
  const meta = cancelled
    ? `${date} · ${t(bundle.cancellation?.by === 'organizer' ? 'myTickets.past.cancelledByOrganizer' : 'myTickets.past.cancelledByYou')}`
    : `${date} · ${format.quantity(bundle)}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${meta}`}
      disabled={cancelled}
      onPress={onOpen}
      className={cn('gap-3.5 rounded-card bg-surface p-4', canRate ? 'border-2 border-accent' : 'border border-border')}
    >
      <View className="flex-row items-center gap-3.5">
        {cancelled ? (
          <View className="h-[60px] w-[60px] items-center justify-center rounded-xl bg-background">
            <Ionicons name="close-circle" size={24} color={palette.red400} />
          </View>
        ) : bundle.event.coverUrl ? (
          <Image source={{ uri: bundle.event.coverUrl }} resizeMode="cover" className="h-[60px] w-[60px] rounded-xl" />
        ) : (
          <View className="h-[60px] w-[60px] items-center justify-center rounded-xl bg-background">
            <Ionicons name="ticket" size={24} color={colors.foregroundMuted} />
          </View>
        )}
        <View className="flex-1 gap-1">
          <Text variant="title" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {meta}
          </Text>
          {cancelled && bundle.cancellation ? (
            <View className="self-start rounded-full bg-background px-2 py-0.5">
              <Text variant="tagStrong" tone="valid">
                {t('myTickets.past.refunded', { amount: formatMoney(bundle.cancellation.refundAmount) })}
              </Text>
            </View>
          ) : bundle.review ? (
            <View
              className="flex-row items-center gap-1"
              accessible
              accessibilityLabel={t('myTickets.past.youRated', { rating: bundle.review.rating, max: MAX_RATING })}
            >
              {Array.from({ length: MAX_RATING }, (_, index) => (
                <Ionicons
                  key={index}
                  name="star"
                  size={14}
                  color={index < (bundle.review?.rating ?? 0) ? palette.amber400 : colors.foregroundMuted}
                />
              ))}
              <Text variant="caption" tone="secondary" className="ml-1">
                {t('myTickets.past.youRated', { rating: bundle.review.rating, max: MAX_RATING })}
              </Text>
            </View>
          ) : bundle.checkedInAt ? (
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="checkmark-circle" size={16} color={colors.valid} />
              <Text variant="caption" tone="valid">
                {t('myTickets.past.checkedIn', { time: formatTime(bundle.checkedInAt, language) })}
              </Text>
            </View>
          ) : null}
        </View>
        {!canRate && !cancelled ? <Ionicons name="chevron-forward" size={18} color={colors.foregroundMuted} /> : null}
      </View>
      {canRate ? (
        <Button label={t('myTickets.past.rate')} icon={<Ionicons name="star" size={18} color={colors.onAction} />} onPress={onRate} />
      ) : null}
    </Pressable>
  );
}
