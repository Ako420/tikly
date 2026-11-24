import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, View } from 'react-native';
import { BookingRow } from '@/components/marketplace/BookingRow';
import { ListFallback } from '@/components/marketplace/LoadingList';
import { ScreenTitle } from '@/components/marketplace/ScreenTitle';
import { StatusPill } from '@/components/marketplace/StatusPill';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { marketplaceApi } from '@/features/marketplace/api';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import type { Booking } from '@/features/marketplace/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme';

const WAITING = ['requested'];
const DONE = ['paid', 'completed'];

export default function Bookings() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useMarketplaceFormat();
  const errorMessage = useApiErrorMessage();
  const bookings = useAsync(() => marketplaceApi.bookings(), 'organizer-bookings');
  const focusedOnce = useRef(false);
  const { reload } = bookings;

  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) reload();
      focusedOnce.current = true;
    }, [reload]),
  );

  const items = bookings.data ?? [];
  const toPay = items.filter((item) => item.status === 'accepted' && item.payment?.status !== 'paid');
  const counts = [
    { key: 'toPay', value: toPay.length, highlight: true },
    { key: 'waiting', value: items.filter((item) => WAITING.includes(item.status)).length },
    { key: 'paid', value: items.filter((item) => DONE.includes(item.status)).length },
  ];
  const ordered = [...toPay, ...items.filter((item) => !toPay.includes(item))];

  const label = (booking: Booking) =>
    booking.service ? `${booking.quantity > 1 ? `${booking.quantity} × ` : ''}${format.text(booking.service.title)}` : t('marketplace.bookings.unknown');
  const providerName = (booking: Booking) => booking.provider?.businessName ?? '';

  const pay = (booking: Booking) =>
    router.push({
      pathname: '/pay',
      params: {
        kind: 'booking',
        ref: booking.id,
        amount: String(booking.amount ?? 0),
        title: label(booking),
        subtitle: `${providerName(booking)} · ${format.range(booking.startDate, booking.endDate)}`,
        ...(booking.payment?.status === 'pending' && { order: booking.payment.orderId }),
      },
    });

  const cancel = (booking: Booking) =>
    Alert.alert(t('marketplace.bookings.cancelTitle'), label(booking), [
      { text: t('marketplace.bookings.keep'), style: 'cancel' },
      {
        text: t('marketplace.bookings.cancel'),
        style: 'destructive',
        onPress: async () => {
          try {
            await marketplaceApi.cancelBooking(booking.id);
            reload();
          } catch (caught) {
            Alert.alert(errorMessage(caught));
          }
        },
      },
    ]);

  const renderBooking = (booking: Booking) => {
    const when = format.range(booking.startDate, booking.endDate);
    if (booking.status === 'accepted' && booking.payment?.status !== 'paid') {
      return (
        <View className="gap-3 rounded-[18px] border-2 border-accent bg-surface-raised p-4">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1 gap-0.5">
              <Text variant="bodySm" tone="secondary" numberOfLines={1}>
                {providerName(booking)}
              </Text>
              <Text variant="subheading">{`${label(booking)} · ${when}`}</Text>
            </View>
            <StatusPill label={t('marketplace.status.accepted')} tone="valid" />
          </View>
          <Button label={t('marketplace.bookings.pay', { amount: formatMoney(booking.amount ?? 0) })} onPress={() => pay(booking)} />
          <Pressable accessibilityRole="button" onPress={() => cancel(booking)} hitSlop={6}>
            <Text variant="caption" tone="muted">
              {t('marketplace.bookings.payHint')}
            </Text>
          </Pressable>
        </View>
      );
    }
    const title = `${label(booking)} · ${providerName(booking)}`;
    switch (booking.status) {
      case 'requested':
        return (
          <Pressable onLongPress={() => cancel(booking)}>
            <BookingRow tone="warning" title={title} subtitle={t('marketplace.bookings.waiting', { when })} />
          </Pressable>
        );
      case 'paid':
      case 'completed':
        return (
          <BookingRow
            tone="valid"
            title={title}
            subtitle={t(`marketplace.bookings.${booking.status}`, { amount: formatMoney(booking.amount ?? 0), when })}
          />
        );
      case 'declined':
        return (
          <BookingRow
            tone="invalid"
            title={title}
            subtitle={booking.declineReason ? t('marketplace.bookings.declinedReason', { reason: booking.declineReason }) : t('marketplace.bookings.declined')}
            trailing={
              booking.service ? (
                <Pressable accessibilityRole="link" onPress={() => router.push('/marketplace')} hitSlop={6}>
                  <Text variant="link" tone="accent">
                    {t('marketplace.bookings.findSimilar')}
                  </Text>
                </Pressable>
              ) : undefined
            }
          />
        );
      default:
        return <BookingRow tone="muted" title={title} subtitle={t('marketplace.status.cancelled')} />;
    }
  };

  const header = (
    <View className="gap-[18px] pb-1">
      <ScreenTitle title={t('marketplace.bookings.title')} />
      {items.length > 0 ? (
        <View className="flex-row gap-2.5">
          {counts.map((count) => (
            <View key={count.key} className="flex-1 gap-1 rounded-2xl border border-border bg-surface-raised p-3.5">
              <Text variant="amountLg" tone={count.highlight && count.value > 0 ? 'accent' : 'primary'}>
                {String(count.value)}
              </Text>
              <Text variant="caption" tone="secondary">
                {t(`marketplace.bookings.counts.${count.key}`)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );

  return (
    <Screen edges={['top']}>
      <FlatList
        data={ordered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerClassName="gap-3 px-6 pb-8 pt-2"
        refreshControl={<RefreshControl refreshing={bookings.loading && items.length > 0} onRefresh={reload} tintColor={colors.accentText} />}
        renderItem={({ item }) => renderBooking(item)}
        ListEmptyComponent={
          <ListFallback
            loading={bookings.loading}
            error={bookings.error}
            onRetry={reload}
            icon="clipboard-outline"
            emptyTitle={t('marketplace.bookings.emptyTitle')}
            emptyBody={t('marketplace.bookings.emptyBody')}
          />
        }
      />
    </Screen>
  );
}
