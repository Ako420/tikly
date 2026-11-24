import { Image, Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useEventFormatter } from '@/features/events/formatEvent';
import type { EventSummary } from '@/features/events/types';
import { useTranslation } from '@/i18n/I18nProvider';

export function EventResultCard({ event, onPress }: { event: EventSummary; onPress?: () => void }) {
  const { t } = useTranslation();
  const format = useEventFormatter();
  const title = format.title(event);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${format.dateTime(event)}, ${event.venue}, ${format.price(event)}`}
      onPress={onPress}
      className="flex-row gap-3.5 rounded-card border border-border bg-surface-raised p-2.5"
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
    >
      {event.coverUrl ? (
        <Image source={{ uri: event.coverUrl }} resizeMode="cover" className="h-[92px] w-[92px] rounded-xl" />
      ) : null}
      <View className="flex-1 gap-[3px] py-0.5">
        <View className="flex-row items-center gap-2">
          <Text variant="eyebrow" tone="accent">
            {format.category(event)}
          </Text>
          {event.sellingFast ? (
            <View className="rounded-full bg-background px-2 py-px">
              <Text variant="tag" tone="warning">
                {t('events.sellingFast')}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="subheading" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" tone="secondary">
          {format.dateTime(event)}
        </Text>
        <View className="mt-auto flex-row items-center justify-between gap-2">
          <Text variant="caption" tone="muted" numberOfLines={1} className="flex-1">
            {event.venue}
          </Text>
          <Text variant="label">{format.price(event)}</Text>
        </View>
      </View>
    </Pressable>
  );
}
