import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, View } from 'react-native';
import { PastTicketCard } from '@/components/tickets/PastTicketCard';
import { TicketListCard } from '@/components/tickets/TicketListCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { env } from '@/config/env';
import { REMINDER_HOURS } from '@/features/tickets/types';
import { useMyTickets } from '@/features/tickets/useMyTickets';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { useTabBarSpace } from '@/components/navigation/TabBar';
import { EnterCell } from '@/components/motion/EnterCell';
import { palette, useTheme } from '@/theme';

type Segment = 'upcoming' | 'past';

export default function Tickets() {
  const tabBarSpace = useTabBarSpace();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const errorMessage = useApiErrorMessage();
  const { upcoming, past, loading, error, refresh } = useMyTickets();
  const [segment, setSegment] = useState<Segment>('upcoming');
  const bundles = segment === 'upcoming' ? upcoming : past;
  const focusedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) refresh();
      focusedOnce.current = true;
    }, [refresh]),
  );

  const empty = loading ? (
    <View className="flex-1 items-center justify-center py-16">
      <ActivityIndicator color={colors.accentText} size="large" />
    </View>
  ) : error ? (
    <EmptyState
      icon="cloud-offline-outline"
      title={t('myTickets.loadFailed')}
      body={errorMessage(error)}
      actionLabel={t('common.retry')}
      onAction={refresh}
    />
  ) : segment === 'upcoming' ? (
    <EmptyState
      icon="ticket-outline"
      title={t('tickets.emptyTitle')}
      body={t('tickets.emptyBody')}
      actionLabel={t('tickets.browse')}
      onAction={() => router.navigate('/explore')}
    />
  ) : (
    <EmptyState icon="time-outline" title={t('myTickets.emptyPastTitle')} body={t('myTickets.emptyPastBody')} />
  );

  return (
    <Screen edges={['top']}>
      <View className="gap-4 px-6 pt-1">
        <Text variant="headline" accessibilityRole="header">
          {t('myTickets.title')}
        </Text>
        <SegmentedControl<Segment>
          value={segment}
          onChange={setSegment}
          segments={[
            { value: 'upcoming', label: t('myTickets.upcoming', { count: upcoming.length }) },
            { value: 'past', label: t('myTickets.pastCount', { count: past.length }) },
          ]}
        />
      </View>
      <FlatList
        CellRendererComponent={EnterCell}
        data={bundles}
        keyExtractor={(bundle) => bundle.id}
        contentContainerClassName="grow gap-3.5 px-6 pb-6 pt-[18px]" contentContainerStyle={{ paddingBottom: tabBarSpace }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          env.useSampleData ? undefined : <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={colors.accentText} />
        }
        ListHeaderComponent={
          segment === 'upcoming' && upcoming.length > 0 ? (
            <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
              <View className="h-9 w-9 items-center justify-center rounded-[10px] bg-primary">
                <Ionicons name="notifications-outline" size={20} color={palette.white} />
              </View>
              <Text variant="caption" tone="secondary" className="flex-1">
                {t('myTickets.reminder', { hours: REMINDER_HOURS })}
              </Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={<View className="flex-1 justify-center">{empty}</View>}
        renderItem={({ item }) =>
          segment === 'past' ? (
            <PastTicketCard
              bundle={item}
              onOpen={() => router.push({ pathname: '/tickets/[bundleId]', params: { bundleId: item.id } })}
              onRate={() => router.push({ pathname: '/tickets/[bundleId]/review', params: { bundleId: item.id } })}
            />
          ) : (
            <TicketListCard bundle={item} onPress={() => router.push({ pathname: '/tickets/[bundleId]', params: { bundleId: item.id } })} />
        )}
      />
    </Screen>
  );
}
