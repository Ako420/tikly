import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { BookingRow } from '@/components/marketplace/BookingRow';
import { ListFallback } from '@/components/marketplace/LoadingList';
import { ScreenTitle } from '@/components/marketplace/ScreenTitle';
import { Screen } from '@/components/ui/Screen';
import { exhibitorApi } from '@/features/exhibitor/api';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import { useTranslation } from '@/i18n/I18nProvider';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useTabBarSpace } from '@/components/navigation/TabBar';
import { useTheme } from '@/theme';

export default function MySlots() {
  const tabBarSpace = useTabBarSpace();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useMarketplaceFormat();
  const bookings = useAsync(() => exhibitorApi.myBookings(), 'my-slot-bookings');
  const items = bookings.data ?? [];
  const { reload } = bookings;
  const focusedOnce = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) reload();
      focusedOnce.current = true;
    }, [reload]),
  );

  return (
    <Screen edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ScreenTitle title={t('exhibitor.mySlotsTitle')} />}
        contentContainerClassName="gap-3 px-6 pb-8 pt-3" contentContainerStyle={{ paddingBottom: tabBarSpace }}
        refreshControl={<RefreshControl refreshing={bookings.loading && items.length > 0} onRefresh={reload} tintColor={colors.accentText} />}
        renderItem={({ item }) => (
          <BookingRow
            tone={item.status === 'paid' ? 'valid' : 'warning'}
            title={`${item.quantity} × ${item.slot?.label ?? ''} · ${item.event ? format.text(item.event.title) : ''}`}
            subtitle={[
              item.event ? format.day(item.event.startAt) : undefined,
              item.event?.venue,
              item.status === 'paid'
                ? t('exhibitor.paid', { amount: formatMoney((item.slot?.price ?? 0) * item.quantity) })
                : t('exhibitor.pending'),
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        )}
        ListEmptyComponent={
          <ListFallback
            loading={bookings.loading}
            error={bookings.error}
            onRetry={reload}
            icon="storefront-outline"
            emptyTitle={t('exhibitor.mySlotsEmptyTitle')}
            emptyBody={t('exhibitor.mySlotsEmptyBody')}
          />
        }
      />
    </Screen>
  );
}
