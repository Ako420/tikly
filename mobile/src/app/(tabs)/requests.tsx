import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';
import { AcceptSheet } from '@/components/marketplace/AcceptSheet';
import { ProviderGate } from '@/components/marketplace/ProviderGate';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Text } from '@/components/ui/Text';
import { marketplaceApi } from '@/features/marketplace/api';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import { bookingDays, estimateBooking, type Booking, type MyProvider } from '@/features/marketplace/types';
import { useMyProvider } from '@/features/marketplace/useProvider';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useNow } from '@/lib/useNow';
import { useTabBarSpace } from '@/components/navigation/TabBar';
import { palette, useTheme } from '@/theme';

const monthStart = (offset = 0) => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + offset, 1);
};

export default function ProviderRequests() {
  const provider = useMyProvider();
  const { reload } = provider;
  return (
    <Screen edges={['top']}>
      <ProviderGate provider={provider.data} loading={provider.loading} error={provider.error} onRetry={reload}>
        {(me) => <Dashboard provider={me} />}
      </ProviderGate>
    </Screen>
  );
}

function Dashboard({ provider }: { provider: MyProvider }) {
  const tabBarSpace = useTabBarSpace();
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const format = useMarketplaceFormat();
  const errorMessage = useApiErrorMessage();
  const bookings = useAsync(() => marketplaceApi.bookings(), 'provider-bookings');
  const earnings = useAsync(
    () =>
      Promise.all([
        marketplaceApi.earnings(monthStart().toISOString()),
        marketplaceApi.earnings(monthStart(-1).toISOString(), monthStart().toISOString()),
      ]),
    'provider-earnings',
  );
  const [accepting, setAccepting] = useState<Booking>();
  const now = useNow();
  const focusedOnce = useRef(false);
  const reloadBookings = bookings.reload;
  const reloadEarnings = earnings.reload;

  const reloadAll = useCallback(() => {
    reloadBookings();
    reloadEarnings();
  }, [reloadBookings, reloadEarnings]);

  useFocusEffect(
    useCallback(() => {
      if (focusedOnce.current) reloadAll();
      focusedOnce.current = true;
    }, [reloadAll]),
  );

  const items = bookings.data ?? [];
  const requests = items.filter((item) => item.status === 'requested');
  const nextJob = items
    .filter((item) => item.status === 'paid' && new Date(item.endDate).getTime() >= now)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  const [current, previous] = earnings.data ?? [];
  const change = current && previous && previous.net > 0 ? Math.round(((current.net - previous.net) / previous.net) * 100) : undefined;
  const feePercent = current && current.gross > 0 ? Math.round((current.commission / current.gross) * 100) : undefined;
  const monthName = new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long' });

  const title = (booking: Booking) =>
    `${booking.quantity} × ${booking.service ? format.text(booking.service.title) : ''} · ${format.range(booking.startDate, booking.endDate)}`;

  const suggested = (booking: Booking) =>
    booking.service
      ? estimateBooking(booking.service.price, booking.service.unit, booking.quantity, bookingDays(booking.startDate, booking.endDate))
      : 0;

  const decline = (booking: Booking) =>
    Alert.alert(t('provider.decline.title'), title(booking), [
      { text: t('provider.decline.keep'), style: 'cancel' },
      {
        text: t('provider.decline.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await marketplaceApi.declineBooking(booking.id);
            reloadBookings();
          } catch (caught) {
            Alert.alert(errorMessage(caught));
          }
        },
      },
    ]);

  return (
    <>
      <ScrollView
        contentContainerClassName="gap-5 px-6 pb-8 pt-3" contentContainerStyle={{ paddingBottom: tabBarSpace }}
        refreshControl={<RefreshControl refreshing={bookings.loading && Boolean(bookings.data)} onRefresh={reloadAll} tintColor={colors.accentText} />}
      >
        <View className="flex-row items-center gap-3">
          <Avatar name={provider.businessName} size="md" />
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text variant="title" numberOfLines={1} className="shrink">
                {provider.businessName}
              </Text>
              {provider.verification === 'verified' ? (
                <MaterialCommunityIcons name="check-decagram" size={18} color={colors.accentText} />
              ) : null}
            </View>
            <Text variant="bodySm" tone="muted">
              {`${t(`provider.verification.${provider.verification}`)} · ${provider.city}`}
            </Text>
          </View>
        </View>

        {provider.verification !== 'verified' ? (
          <View className="gap-1 rounded-2xl border border-warning bg-surface-raised p-4">
            <Text variant="subheading">{t(`provider.verificationBanner.${provider.verification}`)}</Text>
            {provider.rejectionReason ? (
              <Text variant="bodySm" tone="secondary">
                {provider.rejectionReason}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View className="gap-1.5 rounded-[22px] p-5" style={{ backgroundColor: palette.violet600 }}>
          <Text variant="eyebrow" style={{ color: palette.white }}>
            {t('provider.monthEarnings', { month: monthName })}
          </Text>
          <Text variant="display" style={{ color: palette.white }}>
            {formatMoney(current?.net ?? 0)}
          </Text>
          <View className="flex-row items-center gap-1.5">
            {change !== undefined ? <Ionicons name={change >= 0 ? 'trending-up' : 'trending-down'} size={16} color={palette.green400} /> : null}
            <Text variant="caption" style={{ color: palette.violet100 }}>
              {[
                change !== undefined ? t('provider.vsLastMonth', { change: `${change >= 0 ? '+' : ''}${change}%` }) : undefined,
                feePercent !== undefined ? t('provider.afterFee', { percent: feePercent }) : t('provider.paidBookings', { count: current?.paidBookings ?? 0 }),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text variant="sectionTitle">{t('provider.newRequests')}</Text>
            {requests.length > 0 ? (
              <View className="h-7 justify-center rounded-full bg-accent px-2.5">
                <Text variant="label" tone="onAccent">
                  {t('provider.newCount', { count: requests.length })}
                </Text>
              </View>
            ) : null}
          </View>
          {requests.length === 0 && !bookings.loading ? (
            <EmptyState icon="file-tray-outline" title={t('provider.noRequestsTitle')} body={t('provider.noRequestsBody')} />
          ) : null}
          {requests.map((booking) => (
            <View key={booking.id} className="gap-3 rounded-[18px] border border-border bg-surface-raised p-4">
              <View className="flex-row items-start justify-between gap-3">
                <View className="flex-1 gap-0.5">
                  <Text variant="bodySm" tone="secondary" numberOfLines={1}>
                    {booking.organizer?.name ?? ''}
                  </Text>
                  <Text variant="subheading">{title(booking)}</Text>
                  {booking.event ? (
                    <Text variant="caption" tone="muted" numberOfLines={1}>
                      {format.text(booking.event.title)}
                    </Text>
                  ) : null}
                  {booking.note ? (
                    <Text variant="caption" tone="secondary" numberOfLines={3}>
                      {`“${booking.note}”`}
                    </Text>
                  ) : null}
                </View>
                <Text variant="amount">{formatMoney(suggested(booking))}</Text>
              </View>
              <View className="flex-row gap-2.5">
                <Button variant="outline" size="md" fullWidth={false} className="flex-1" label={t('provider.decline.action')} onPress={() => decline(booking)} />
                <Button size="md" fullWidth={false} className="flex-1" label={t('provider.accept.action')} onPress={() => setAccepting(booking)} />
              </View>
            </View>
          ))}
        </View>

        {nextJob ? (
          <View className="gap-3">
            <SectionHeader title={t('provider.nextJob')} />
            <View className="flex-row items-center gap-3 rounded-[18px] border border-border bg-surface-raised p-4">
              <Ionicons name="calendar" size={22} color={colors.accentText} />
              <View className="flex-1 gap-0.5">
                <Text variant="subheading">{`${nextJob.quantity} × ${nextJob.service ? format.text(nextJob.service.title) : ''} · ${format.day(nextJob.startDate)}`}</Text>
                <Text variant="caption" tone="muted">
                  {[t('marketplace.status.paid'), nextJob.organizer?.name, nextJob.event ? format.text(nextJob.event.title) : undefined].filter(Boolean).join(' · ')}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      {accepting ? (
        <AcceptSheet
          title={title(accepting)}
          suggested={suggested(accepting)}
          onClose={() => setAccepting(undefined)}
          onConfirm={async (amount) => {
            await marketplaceApi.acceptBooking(accepting.id, amount);
            setAccepting(undefined);
            reloadBookings();
          }}
        />
      ) : null}
    </>
  );
}
