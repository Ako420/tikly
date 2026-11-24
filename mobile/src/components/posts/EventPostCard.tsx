import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image, ScrollView, View, useWindowDimensions } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { localize } from '@/features/events/types';
import type { EventPost, PostType } from '@/features/posts/api';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { getRelativeTime } from '@/lib/dates';
import { useTheme } from '@/theme';

const typeClass: Record<PostType, { container: string; tone: 'onPrimary' | 'onAccent' | 'primary' }> = {
  promo: { container: 'bg-accent', tone: 'onAccent' },
  speaker: { container: 'bg-primary', tone: 'onPrimary' },
  update: { container: 'border border-border bg-background', tone: 'primary' },
};

type EventPostCardProps = {
  post: EventPost;
  author: string;
  verified: boolean;
};

export function EventPostCard({ post, author, verified }: EventPostCardProps) {
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const relative = getRelativeTime(post.createdAt);
  const badge = typeClass[post.type];
  const imageWidth = post.images.length > 1 ? width * 0.7 : undefined;

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
        {post.pinned ? <Ionicons name="pin" size={16} color={colors.accentText} accessibilityLabel={t('posts.pinned')} /> : null}
        <View className={cn('rounded-full px-2.5 py-[3px]', badge.container)}>
          <Text variant="label" tone={badge.tone}>
            {t(`posts.types.${post.type}`)}
          </Text>
        </View>
      </View>

      <View className="gap-1">
        <Text variant="subheading">{localize(post.title, language)}</Text>
        <Text tone="secondary">{localize(post.body, language)}</Text>
      </View>

      {post.speaker ? (
        <View className="flex-row items-center gap-2.5 rounded-xl border border-border bg-background p-2.5">
          {post.speaker.photoUrl ? (
            <Image source={{ uri: post.speaker.photoUrl }} className="h-9 w-9 rounded-full" />
          ) : (
            <Avatar name={post.speaker.name} size="sm" />
          )}
          <View className="flex-1">
            <Text variant="link">{post.speaker.name}</Text>
            {post.speaker.role ? (
              <Text variant="captionSm" tone="muted">
                {post.speaker.role}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {post.images.length === 1 ? (
        <Image source={{ uri: post.images[0] }} resizeMode="cover" className="h-[190px] w-full rounded-xl" accessibilityIgnoresInvertColors />
      ) : post.images.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
          {post.images.map((uri) => (
            <Image key={uri} source={{ uri }} resizeMode="cover" className="h-[190px] rounded-xl" style={{ width: imageWidth }} accessibilityIgnoresInvertColors />
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
