import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { FlatList, Image, Pressable, RefreshControl, View } from 'react-native';
import { useTabBarSpace } from '@/components/navigation/TabBar';
import { ListFallback } from '@/components/marketplace/LoadingList';
import { ScreenTitle } from '@/components/marketplace/ScreenTitle';
import { StatusPill } from '@/components/marketplace/StatusPill';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import { organizerApi, type OrganizerEvent } from '@/features/organizer/api';
import { daysUntil, STATUS_TONE } from '@/features/organizer/format';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { formatDateRange } from '@/lib/dates';
import { formatAmount, formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme';

const ORDER = ['published', 'pending', 'rejected', 'draft', 'completed', 'cancelled', 'suspended'];

async function loadEvents() {
  const events = await organizerApi.events();
  const published = events.filter((event) => event.status === 'published' || event.status === 'completed');
  const stats = await Promise.all(published.map((event) => organizerApi.stats(event.id).catch(() => undefined)));
  const statsById = new Map(published.map((event, index) => [event.id, stats[index]]));
  return events
    .map((event) => ({ event, stats: statsById.get(event.id) }))
    .sort((a, b) => ORDER.indexOf(a.event.status) - ORDER.indexOf(b.event.status));
}

export default function MyEvents() {
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const format = useMarketplaceFormat();
  const now = useNow();
  const tabBarSpace = useTabBarSpace();
  const events = useAsync(loadEvents, 'organizer-events');
  const items = events.data ?? [];
  const { reload } = events;
  const focusedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) reload();
      focusedOnce.current = true;
    }, [reload]),
  );

  const open = (event: OrganizerEvent) =>
    event.status === 'draft' || event.status === 'rejected'
      ? router.push({ pathname: '/organizer/new', params: { id: event.id } })
      : router.push({ pathname: '/organizer/[id]', params: { id: event.id } });

  const renderItem = ({ item }: { item: Awaited<ReturnType<typeof loadEvents>>[number] }) => {
    const { event, stats } = item;
    const title = format.text(event.title);
    const pill = <StatusPill label={t(`organizer.status.${event.status}`)} tone={STATUS_TONE[event.status]} />;

    if (event.status === 'draft') {
      return (
        <Pressable
          accessibilityRole="button"
          onPress={() => open(event)}
          className="flex-row items-center gap-3 rounded-[22px] border border-dashed border-border p-4"
        >
          <View className="flex-1 gap-1.5">
            <View className="flex-row">{pill}</View>
            <Text variant="titleLg" numberOfLines={2}>
              {title}
            </Text>
            <Text variant="caption" tone="muted">
              {t('organizer.draftHint')}
            </Text>
          </View>
          <Text variant="link" tone="accent">
            {t('organizer.continue')}
          </Text>
        </Pressable>
      );
    }

    const capacity = stats?.tiers.reduce((sum, tier) => sum + tier.quantity, 0) ?? 0;
    const sold = stats?.totals.ticketsSold ?? 0;
    const days = daysUntil(event.startAt, now);
    const subtitle =
      event.status === 'pending'
        ? t('organizer.submitted')
        : `${formatDateRange(event.startAt, event.endAt, language, false)}${days > 0 && event.status === 'published' ? ` · ${t(days === 1 ? 'organizer.tomorrow' : 'organizer.inDays', { count: days })}` : ''}`;

    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => open(event)}
        className={cn(
          'gap-3.5 rounded-[22px] bg-surface-raised p-4',
          event.status === 'published' ? 'border-2 border-accent' : 'border border-border',
        )}
      >
        <View className="flex-row items-center gap-3">
          {event.coverUrl ? (
            <Image source={{ uri: event.coverUrl }} className="h-14 w-14 rounded-xl" />
          ) : (
            <View className="h-14 w-14 items-center justify-center rounded-xl bg-surface">
              <Ionicons name="calendar" size={24} color={colors.accentText} />
            </View>
          )}
          <View className="flex-1 gap-1">
            <View className="flex-row">{pill}</View>
            <Text variant="title" numberOfLines={2}>
              {title}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.foregroundMuted} />
        </View>

        {event.status === 'rejected' ? (
          <>
            {event.rejectionReason ? (
              <View className="rounded-2xl bg-surface p-3.5">
                <Text variant="bodySm" tone="secondary">
                  {`“${event.rejectionReason}” · ${t('organizer.admin')}`}
                </Text>
              </View>
            ) : null}
            <Button
              variant="outline"
              size="md"
              label={t('organizer.fixResubmit')}
              icon={<Ionicons name="create-outline" size={18} color={colors.accentText} />}
              onPress={() => open(event)}
            />
          </>
        ) : null}

        {stats && capacity > 0 ? (
          <View className="gap-2">
            <View className="flex-row items-center justify-between">
              <Text variant="captionStrong">{t('organizer.soldOf', { sold: formatAmount(sold), capacity: formatAmount(capacity) })}</Text>
              <Text variant="captionStrong" tone="accent">
                {formatMoney(stats.totals.gross)}
              </Text>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-surface">
              <View className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (sold / capacity) * 100)}%` }} />
            </View>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <Screen edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.event.id}
        ListHeaderComponent={
          <ScreenTitle
            eyebrow={user?.name}
            title={t('organizer.myEvents')}
            trailing={
              <Button
                size="md"
                fullWidth={false}
                label={t('organizer.newEvent')}
                icon={<Ionicons name="add" size={18} color={colors.onAction} />}
                onPress={() => router.push('/organizer/new')}
              />
            }
          />
        }
        contentContainerClassName="gap-3 px-6 pt-3"
        contentContainerStyle={{ paddingBottom: tabBarSpace }}
        refreshControl={<RefreshControl refreshing={events.loading && items.length > 0} onRefresh={reload} tintColor={colors.accentText} />}
        renderItem={renderItem}
        ListEmptyComponent={
          <ListFallback
            loading={events.loading}
            error={events.error}
            onRetry={reload}
            icon="calendar-outline"
            emptyTitle={t('organizer.emptyTitle')}
            emptyBody={t('organizer.emptyBody')}
          />
        }
      />
    </Screen>
  );
}
