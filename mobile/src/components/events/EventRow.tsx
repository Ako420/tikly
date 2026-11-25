import { Image, Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useEventFormatter } from '@/features/events/formatEvent';
import type { EventSummary } from '@/features/events/types';

export function EventRow({ event, onPress }: { event: EventSummary; onPress?: () => void }) {
  const format = useEventFormatter();
  const title = format.title(event);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${format.dateTime(event)}, ${format.price(event)}`}
      onPress={onPress}
      className="flex-row items-center gap-3.5 rounded-card border border-border bg-surface-raised p-2.5"
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
    >
      {event.coverUrl ? (
        <Image source={{ uri: event.coverUrl }} resizeMode="cover" className="h-[76px] w-[76px] rounded-xl" />
      ) : null}
      <View className="flex-1 gap-[3px]">
        <Text variant="eyebrow" tone="accent">
          {format.category(event)}
        </Text>
        <Text variant="subheading" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" tone="muted">
          {format.dateTime(event)}
        </Text>
      </View>
      <Text variant="label" className="self-start pt-0.5">
        {format.price(event)}
      </Text>
    </Pressable>
  );
}
