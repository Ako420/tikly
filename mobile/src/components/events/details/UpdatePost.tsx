import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { localize, type EventUpdate } from '@/features/events/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { getRelativeTime } from '@/lib/dates';
import { openInMaps } from '@/lib/share';
import { useTheme } from '@/theme';

const tagClass: Record<EventUpdate['tag'], { container: string; tone: 'onPrimary' | 'onAccent' | 'primary' }> = {
  lineup: { container: 'bg-primary', tone: 'onPrimary' },
  location: { container: 'bg-accent', tone: 'onAccent' },
  info: { container: 'border border-border bg-background', tone: 'primary' },
};

type UpdatePostProps = {
  update: EventUpdate;
  author: string;
  verified: boolean;
};

export function UpdatePost({ update, author, verified }: UpdatePostProps) {
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const [liked, setLiked] = useState(false);
  const relative = getRelativeTime(update.postedAt);
  const tag = tagClass[update.tag];

  return (
    <View className="gap-3 rounded-card border border-border bg-surface-raised p-4">
      <View className="flex-row items-center gap-2.5">
        <Avatar name={author} size="sm" />
        <View className="flex-1">
          <View className="flex-row items-center gap-1">
            <Text variant="link" numberOfLines={1} className="shrink">
              {author}
            </Text>
            {verified ? <MaterialCommunityIcons name="check-decagram" size={16} color={colors.accentText} /> : null}
          </View>
          <Text variant="captionSm" tone="muted">
            {t(`time.${relative.unit}`, { count: relative.count })}
          </Text>
        </View>
        <View className={cn('rounded-full px-2.5 py-[3px]', tag.container)}>
          <Text variant="label" tone={tag.tone}>
            {t(`events.updateTags.${update.tag}`)}
          </Text>
        </View>
      </View>
      <Text tone="secondary">{localize(update.body, language)}</Text>
      {update.photoUrl ? (
        <Image source={{ uri: update.photoUrl }} resizeMode="cover" className="h-[170px] w-full rounded-xl" />
      ) : null}
      {update.place ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={t('events.openInMaps', { place: update.place.name })}
          onPress={() => openInMaps(`${update.place?.name}, ${update.place?.address}`)}
          className="flex-row items-center gap-2.5 rounded-xl border border-border bg-background p-2.5"
        >
          <View className="h-9 w-9 items-center justify-center rounded-logo-sm bg-accent">
            <Ionicons name="location" size={18} color={colors.onAccent} />
          </View>
          <View className="flex-1">
            <Text variant="link">{update.place.name}</Text>
            <Text variant="captionSm" tone="muted">
              {update.place.address}
            </Text>
          </View>
          <Ionicons name="open-outline" size={18} color={colors.accentText} />
        </Pressable>
      ) : null}
      <View className="flex-row items-center gap-[18px]">
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: liked }}
          accessibilityLabel={t('events.like')}
          onPress={() => setLiked((value) => !value)}
          hitSlop={8}
          className="flex-row items-center gap-1.5"
        >
          <Ionicons name={liked ? 'heart' : 'heart-outline'} size={18} color={liked ? colors.invalid : colors.foregroundSecondary} />
          <Text variant="captionStrong" tone="secondary">
            {update.likes + (liked ? 1 : 0)}
          </Text>
        </Pressable>
        <View className="flex-row items-center gap-1.5">
          <Ionicons name="chatbubble-outline" size={18} color={colors.foregroundSecondary} />
          <Text variant="captionStrong" tone="secondary">
            {update.comments}
          </Text>
        </View>
      </View>
    </View>
  );
}
