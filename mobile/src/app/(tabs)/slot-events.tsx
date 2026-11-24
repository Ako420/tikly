import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { FlatList, Image, RefreshControl, View } from 'react-native';
import { ListFallback } from '@/components/marketplace/LoadingList';
import { ScreenTitle } from '@/components/marketplace/ScreenTitle';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { exhibitorApi, type SlotEvent } from '@/features/exhibitor/api';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import { useTranslation } from '@/i18n/I18nProvider';
import { formatDateRange } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useTabBarSpace } from '@/components/navigation/TabBar';
import { useTheme } from '@/theme';

const FEW_LEFT = 5;

export default function SlotEvents() {
  const tabBarSpace = useTabBarSpace();
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const { user } = useAuth();
  const format = useMarketplaceFormat();
  const events = useAsync(() => exhibitorApi.events(), 'slot-events');
  const items = events.data ?? [];
  const { reload } = events;
  const focusedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) reload();
      focusedOnce.current = true;
    }, [reload]),
  );

  const renderEvent = (event: SlotEvent) => {
    const few = event.slotsAvailable <= FEW_LEFT;
    return (
      <View className="overflow-hidden rounded-[22px] border border-border bg-surface-raised">
        {event.coverUrl ? <Image source={{ uri: event.coverUrl }} className="h-[120px] w-full" /> : null}
        <View className="gap-2 p-4">
          <Text variant="titleLg" numberOfLines={2}>
            {format.text(event.title)}
          </Text>
          <Text variant="bodySm" tone="muted" numberOfLines={1}>
            {`${formatDateRange(event.startAt, event.endAt, language, false)} · ${event.venue}`}
          </Text>
          <View className="flex-row items-center justify-between">
            <Text variant="bodySmStrong" tone={few ? 'warning' : 'valid'}>
              {few ? t('exhibitor.onlyLeft', { count: event.slotsAvailable }) : t('exhibitor.left', { count: event.slotsAvailable })}
            </Text>
            {event.slotPriceFrom !== null ? (
              <Text variant="link">{t('exhibitor.from', { price: formatMoney(event.slotPriceFrom) })}</Text>
            ) : null}
          </View>
          <Button
            className="mt-1"
            label={t('exhibitor.seeSlots')}
            icon={<Ionicons name="storefront" size={18} color={colors.onAction} />}
            onPress={() => router.push({ pathname: '/slots/[eventId]', params: { eventId: event.id } })}
          />
        </View>
      </View>
    );
  };

  return (
    <Screen edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <ScreenTitle eyebrow={[user?.name, t('exhibitor.role')].filter(Boolean).join(' · ')} title={t('exhibitor.eventsTitle')} />
        }
        contentContainerClassName="gap-4 px-6 pb-8 pt-3"
        contentContainerStyle={{ paddingBottom: tabBarSpace }}
        refreshControl={<RefreshControl refreshing={events.loading && items.length > 0} onRefresh={events.reload} tintColor={colors.accentText} />}
        renderItem={({ item }) => renderEvent(item)}
        ListEmptyComponent={
          <ListFallback
            loading={events.loading}
            error={events.error}
            onRetry={events.reload}
            icon="calendar-outline"
            emptyTitle={t('exhibitor.emptyTitle')}
            emptyBody={t('exhibitor.emptyBody')}
          />
        }
      />
    </Screen>
  );
}
