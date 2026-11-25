import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';
import { EventListSkeleton } from '@/components/events/EventSkeletons';
import { EventResultCard } from '@/components/events/EventResultCard';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SearchField, type SearchFieldHandle } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { DEFAULT_LOCATION } from '@/features/events/location';
import { useEvents, type EventSort } from '@/features/events/useEvents';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { useTabBarSpace } from '@/components/navigation/TabBar';
import { EnterCell } from '@/components/motion/EnterCell';
import { useTheme } from '@/theme';

export default function Explore() {
  const tabBarSpace = useTabBarSpace();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ focus?: string }>();
  const searchRef = useRef<SearchFieldHandle>(null);

  const [query, setQuery] = useState('');
  const [city, setCity] = useState<string | undefined>(DEFAULT_LOCATION.city);
  const [thisMonth, setThisMonth] = useState(false);
  const [sort, setSort] = useState<EventSort>('soonest');

  const { data: events, loading, error, refetch } = useEvents({ city, thisMonth, query, sort });
  const errorMessage = useApiErrorMessage();
  const results = error || loading ? [] : events;
  const activeFilters = Number(!!city) + Number(thisMonth);

  useFocusEffect(
    useCallback(() => {
      if (params.focus !== '1') return;
      const timer = setTimeout(() => searchRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }, [params.focus]),
  );

  const clearFilters = () => {
    setQuery('');
    setCity(undefined);
    setThisMonth(false);
  };

  return (
    <Screen edges={['top']}>
      <View className="h-14 flex-row items-center justify-between px-6">
        <Text variant="headline" accessibilityRole="header">
          {t('explore.title')}
        </Text>
        <Pressable
          accessibilityRole="button"
          className="h-11 flex-row items-center gap-2 rounded-full border border-border bg-surface-raised px-3.5"
        >
          <Ionicons name="options" size={18} color={colors.accentText} />
          <Text variant="bodySmStrong">
            {activeFilters > 0 ? t('explore.filtersCount', { count: activeFilters }) : t('explore.filters')}
          </Text>
        </Pressable>
      </View>

      <FlatList
        CellRendererComponent={EnterCell}
        data={results}
        keyExtractor={(event) => event.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-3 pb-6" contentContainerStyle={{ paddingBottom: tabBarSpace }}
        ListHeaderComponent={
          <View className="gap-4 pb-1 pt-2">
            <SearchField
              ref={searchRef}
              className="mx-6"
              placeholder={t('events.searchPlaceholder')}
              value={query}
              onChangeText={setQuery}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-6">
              {city ? (
                <Chip
                  label={city}
                  icon="map-marker"
                  selected
                  trailing="remove"
                  accessibilityLabel={t('explore.removeFilter', { filter: city })}
                  onPress={() => setCity(undefined)}
                />
              ) : null}
              <Chip
                label={t('explore.thisMonth')}
                icon="calendar-month"
                selected={thisMonth}
                trailing={thisMonth ? 'remove' : undefined}
                accessibilityLabel={thisMonth ? t('explore.removeFilter', { filter: t('explore.thisMonth') }) : undefined}
                onPress={() => setThisMonth((value) => !value)}
              />
              <Chip label={t('explore.category')} trailing="expand" />
              <Chip label={t('explore.price')} trailing="expand" />
            </ScrollView>
            <View className="flex-row items-center justify-between px-6">
              <Text variant="bodySmStrong" tone="secondary">
                {loading || error ? ' ' : t(results.length === 1 ? 'explore.resultsOne' : 'explore.resultsOther', { count: results.length })}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setSort((current) => (current === 'soonest' ? 'latest' : 'soonest'))}
                hitSlop={8}
                className="flex-row items-center gap-1"
              >
                <Text variant="link" tone="accent">
                  {t(sort === 'soonest' ? 'explore.sortSoonest' : 'explore.sortLatest')}
                </Text>
                <Ionicons name="chevron-down" size={14} color={colors.accentText} />
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <View className="px-6">
            <EventResultCard event={item} onPress={() => router.push({ pathname: '/events/[id]', params: { id: item.id } })} />
          </View>
        )}
        refreshing={false}
        onRefresh={refetch}
        ListEmptyComponent={
          loading ? (
            <View className="px-6">
              <EventListSkeleton count={4} variant="result" />
            </View>
          ) : error ? (
            <EmptyState
              icon="cloud-offline-outline"
              title={t('errors.generic')}
              body={errorMessage(error)}
              actionLabel={t('errors.retry')}
              onAction={refetch}
            />
          ) : (
          <EmptyState
            icon="search-outline"
            title={t('explore.emptyTitle')}
            body={t('explore.emptyBody')}
            actionLabel={t('explore.clearFilters')}
            onAction={clearFilters}
          />
          )
        }
      />
    </Screen>
  );
}
