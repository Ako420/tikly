import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { EventListSkeleton, FeaturedSkeleton } from '@/components/events/EventSkeletons';
import { EventRow } from '@/components/events/EventRow';
import { FEATURED_CARD_WIDTH, FeaturedEventCard } from '@/components/events/FeaturedEventCard';
import { Avatar } from '@/components/ui/Avatar';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { ALL_CATEGORIES_ICON, categoryIcons } from '@/features/events/categories';
import { sampleUser } from '@/features/events/sampleEvents';
import { EVENT_CATEGORIES, type EventCategory } from '@/features/events/types';
import { useEvents } from '@/features/events/useEvents';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { useTheme } from '@/theme';

const FEATURED_GAP = 14;
const FEATURED_COUNT = 5;

export default function Home() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [category, setCategory] = useState<EventCategory | undefined>();
  const { data: events, loading, error, refetch } = useEvents({ city: sampleUser.city, category });
  const featured = events.filter((event) => event.coverUrl).slice(0, FEATURED_COUNT);
  const errorMessage = useApiErrorMessage();

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerClassName="gap-[22px] pb-6" showsVerticalScrollIndicator={false}>
        <View className="h-14 flex-row items-center justify-between px-6">
          <Pressable accessibilityRole="button" accessibilityLabel={t('home.changeCity')} className="gap-0.5">
            <Text variant="eyebrow" tone="accent">
              {t('home.yourCity')}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="location" size={18} color={colors.foreground} />
              <Text variant="subheading">{`${sampleUser.city}, ${sampleUser.country}`}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.foregroundMuted} />
            </View>
          </Pressable>
          <View className="flex-row items-center gap-2.5">
            <IconButton
              size="lg"
              badge
              accessibilityLabel={t('home.notifications')}
              icon={<Ionicons name="notifications-outline" size={22} color={colors.foreground} />}
            />
            <Avatar name={sampleUser.name} onPress={() => router.navigate('/profile')} />
          </View>
        </View>

        <View className="gap-4 px-6">
          <Text variant="headline" accessibilityRole="header">
            {t('home.title')}
          </Text>
          <View className="flex-row items-center gap-2.5">
            <SearchField
              className="flex-1"
              placeholder={t('events.searchPlaceholder')}
              onPressWhenReadOnly={() => router.navigate({ pathname: '/explore', params: { focus: '1' } })}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('explore.filters')}
              onPress={() => router.navigate('/explore')}
              className="h-[52px] w-[52px] items-center justify-center rounded-2xl bg-action"
            >
              <Ionicons name="options" size={22} color={colors.onAction} />
            </Pressable>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-6">
          <Chip
            label={t('events.categories.all')}
            icon={ALL_CATEGORIES_ICON}
            selected={!category}
            onPress={() => setCategory(undefined)}
          />
          {EVENT_CATEGORIES.map((option) => (
            <Chip
              key={option}
              label={t(`events.categories.${option}.plural`)}
              icon={categoryIcons[option]}
              selected={category === option}
              onPress={() => setCategory(option)}
            />
          ))}
        </ScrollView>

        {loading ? (
          <View className="flex-row gap-3.5 overflow-hidden px-6">
            <FeaturedSkeleton width={FEATURED_CARD_WIDTH} />
            <FeaturedSkeleton width={FEATURED_CARD_WIDTH} />
          </View>
        ) : featured.length > 0 && !error ? (
          <View className="gap-3.5">
            <SectionHeader
              title={t('home.featured')}
              actionLabel={t('common.seeAll')}
              onAction={() => router.navigate('/explore')}
              className="px-6"
            />
            <FlatList
              data={featured}
              keyExtractor={(event) => event.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={FEATURED_CARD_WIDTH + FEATURED_GAP}
              decelerationRate="fast"
              contentContainerClassName="px-6"
              ItemSeparatorComponent={() => <View style={{ width: FEATURED_GAP }} />}
              renderItem={({ item }) => (
                <FeaturedEventCard event={item} onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.id } })} />
              )}
            />
          </View>
        ) : null}

        <View className="gap-3.5 px-6">
          <SectionHeader
            title={t('home.comingUp', { city: sampleUser.city })}
            actionLabel={t('common.seeAll')}
            onAction={() => router.navigate('/explore')}
          />
          {loading ? (
            <EventListSkeleton />
          ) : error ? (
            <EmptyState
              icon="cloud-offline-outline"
              title={t('errors.generic')}
              body={errorMessage(error)}
              actionLabel={t('errors.retry')}
              onAction={refetch}
            />
          ) : events.length > 0 ? (
            <View className="gap-3">
              {events.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  onPress={() => router.push({ pathname: '/events/[id]', params: { id: event.id } })}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title={t('home.emptyTitle')}
              body={t('home.emptyBody')}
              actionLabel={t('events.categories.all')}
              onAction={() => setCategory(undefined)}
            />
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
