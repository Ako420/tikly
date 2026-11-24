import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, Share, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useEventFormatter } from '@/features/events/formatEvent';
import type { EventSummary } from '@/features/events/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { palette, ThemeScope, withAlpha } from '@/theme';
import { DateBadge } from './DateBadge';

export const FEATURED_CARD_WIDTH = 300;

type FeaturedEventCardProps = {
  event: EventSummary;
  onPress?: () => void;
};

export function FeaturedEventCard({ event, onPress }: FeaturedEventCardProps) {
  const { t } = useTranslation();
  const format = useEventFormatter();
  const title = format.title(event);
  const badge = format.dateBadge(event);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${format.dateTime(event)}, ${event.venue}, ${format.price(event)}`}
      onPress={onPress}
      style={{ width: FEATURED_CARD_WIDTH }}
      className="h-[200px] overflow-hidden rounded-[20px]"
    >
      <ThemeScope scheme="dark" className="flex-1 justify-between p-3.5">
        {event.coverUrl ? (
          <Image source={{ uri: event.coverUrl }} resizeMode="cover" className="absolute inset-0" />
        ) : (
          <View className="absolute inset-0 bg-surface" />
        )}
        <LinearGradient
          colors={[withAlpha(palette.violet950, 0), palette.violet950]}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 }}
        />
        <View className="flex-row items-start justify-between">
          <DateBadge day={badge.day} month={badge.month} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('events.share')}
            onPress={() => Share.share({ message: t('events.shareMessage', { title, venue: event.venue }) })}
            hitSlop={6}
            className="h-10 w-10 items-center justify-center rounded-full bg-background"
          >
            <Ionicons name="share-outline" size={20} color={palette.white} />
          </Pressable>
        </View>
        <View className="gap-1">
          <Text variant="eyebrow" tone="accent">
            {format.category(event)}
          </Text>
          <Text variant="titleLg" numberOfLines={1}>
            {title}
          </Text>
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-1">
              <Ionicons name="location" size={14} color={palette.violet100} />
              <Text variant="caption" tone="secondary" numberOfLines={1} className="flex-1">
                {event.venue}
              </Text>
            </View>
            <Text variant="label">{format.price(event)}</Text>
          </View>
        </View>
      </ThemeScope>
    </Pressable>
  );
}
