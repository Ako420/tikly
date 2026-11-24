import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, View } from 'react-native';
import { EventPostCard } from '@/components/posts/EventPostCard';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useEventFormatter } from '@/features/events/formatEvent';
import { useEventDetails } from '@/features/events/useEvents';
import type { PostType } from '@/features/posts/api';
import { useEventPosts } from '@/features/posts/useEventPosts';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { useTheme } from '@/theme';

const FILTERS: (PostType | 'all')[] = ['all', 'update', 'speaker', 'promo'];

export default function EventPostsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useEventFormatter();
  const errorMessage = useApiErrorMessage();
  const event = useEventDetails(id).data;
  const [filter, setFilter] = useState<PostType | 'all'>('all');
  const posts = useEventPosts(id, { type: filter === 'all' ? undefined : filter });
  const author = event?.organizer?.name ?? '';
  const verified = !!event?.organizer?.verified;

  const header = (
    <View className="gap-4 pb-2">
      <View className="gap-1.5">
        <Text variant="eyebrow" tone="accent">
          {t('posts.eyebrow')}
        </Text>
        <Text variant="headline" accessibilityRole="header" numberOfLines={2}>
          {event ? format.title(event) : t('posts.title')}
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6" contentContainerClassName="gap-2 px-6">
        {FILTERS.map((value) => (
          <Chip
            key={value}
            label={t(value === 'all' ? 'events.categories.all' : `posts.types.${value}`)}
            selected={filter === value}
            onPress={() => setFilter(value)}
          />
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Screen>
      <View className="h-[52px] flex-row items-center px-6">
        <IconButton
          icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
          accessibilityLabel={t('common.back')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/events/[id]', params: { id } }))}
        />
      </View>
      <FlatList
        data={posts.items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerClassName="gap-3 px-6 pb-8 pt-2"
        onEndReached={posts.loadMore}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => <EventPostCard post={item} author={author} verified={verified} />}
        ListEmptyComponent={
          posts.loading ? (
            <ActivityIndicator color={colors.accentText} className="py-10" />
          ) : posts.error ? (
            <EmptyState
              icon="cloud-offline-outline"
              title={t('posts.errorTitle')}
              body={errorMessage(posts.error)}
              actionLabel={t('posts.retry')}
              onAction={posts.reload}
            />
          ) : (
            <EmptyState icon="newspaper-outline" title={t('posts.emptyTitle')} body={t('posts.emptyBody')} />
          )
        }
        ListFooterComponent={posts.loading && posts.items.length > 0 ? <ActivityIndicator color={colors.accentText} className="py-4" /> : undefined}
      />
    </Screen>
  );
}
