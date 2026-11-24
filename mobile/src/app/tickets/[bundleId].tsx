import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, View, useWindowDimensions } from 'react-native';
import { FullTicketCard } from '@/components/tickets/FullTicketCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTicketFormatter } from '@/features/tickets/formatTicket';
import { shareTicketsPdf } from '@/features/tickets/ticketPdf';
import { cancelTicket } from '@/features/tickets/api';
import { isPastBundle } from '@/features/tickets/types';
import { useTicketBundle } from '@/features/tickets/useMyTickets';
import { useScanBrightness } from '@/features/tickets/useScanBrightness';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { googleCalendarUrl } from '@/lib/share';
import { useTheme } from '@/theme';

const GUTTER = 24;
const DEFAULT_EVENT_MS = 6 * 60 * 60 * 1000;

export default function TicketDetail() {
  const { bundleId } = useLocalSearchParams<{ bundleId: string }>();
  const { bundle, loading, refresh } = useTicketBundle(bundleId);
  const errorMessage = useApiErrorMessage();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const format = useTicketFormatter();
  const brightnessRaised = useScanBrightness();
  const [index, setIndex] = useState(0);
  const [exporting, setExporting] = useState(false);

  if (!bundle) {
    return (
      <Screen>
        <View className="flex-1 justify-center">
          {loading ? (
            <ActivityIndicator color={colors.accentText} size="large" />
          ) : (
            <EmptyState
              icon="ticket-outline"
              title={t('myTickets.detail.notFoundTitle')}
              body={t('myTickets.detail.notFoundBody')}
              actionLabel={t('common.back')}
              onAction={() => router.back()}
            />
          )}
        </View>
      </Screen>
    );
  }

  const title = format.title(bundle);
  const total = bundle.tickets.length;

  const current = bundle.tickets[Math.min(index, total - 1)];
  const attended = bundle.tickets.some((ticket) => ticket.checkedIn);
  const canReview = attended && isPastBundle(bundle);

  const submitCancel = async () => {
    if (!current) return;
    try {
      const { refund } = await cancelTicket(current.id);
      Alert.alert(
        t('myTickets.refund.doneTitle'),
        refund.amount > 0 ? t('myTickets.refund.doneBody', { amount: formatMoney(refund.amount) }) : t('myTickets.refund.doneNoRefund'),
      );
      setIndex(0);
      await refresh();
      if (total <= 1) router.back();
    } catch (caught) {
      Alert.alert(t('myTickets.refund.failedTitle'), errorMessage(caught));
    }
  };

  const confirmCancel = () => {
    if (!current) return;
    const refund = current.price ? Math.floor(current.price / 2) : 0;
    Alert.alert(
      t('myTickets.refund.confirmTitle', { code: current.code }),
      refund > 0 ? t('myTickets.refund.confirmBody', { amount: formatMoney(refund) }) : t('myTickets.refund.confirmFree'),
      [
        { text: t('myTickets.refund.keep'), style: 'cancel' },
        { text: t('myTickets.refund.confirm'), style: 'destructive', onPress: submitCancel },
      ],
    );
  };

  const openMenu = () =>
    Alert.alert(title, undefined, [
      {
        text: t('myTickets.detail.viewEvent'),
        onPress: () => router.push({ pathname: '/events/[id]', params: { id: bundle.event.id } }),
      },
      ...(canReview
        ? [
            {
              text: t('myTickets.detail.rateEvent'),
              onPress: () => router.push({ pathname: '/events/[id]/reviews', params: { id: bundle.event.id, write: '1' } }),
            },
          ]
        : []),
      ...(current?.refundable
        ? [{ text: t('myTickets.refund.action'), style: 'destructive' as const, onPress: confirmCancel }]
        : []),
      { text: t('myTickets.detail.cancel'), style: 'cancel' },
    ]);

  const addToCalendar = () =>
    Linking.openURL(
      googleCalendarUrl({
        title,
        startAt: bundle.event.startAt,
        endAt: bundle.event.endAt ?? new Date(new Date(bundle.event.startAt).getTime() + DEFAULT_EVENT_MS).toISOString(),
        location: `${bundle.event.venue}, ${bundle.event.city}`,
      }),
    );

  const downloadPdf = async () => {
    setExporting(true);
    try {
      await shareTicketsPdf(
        bundle.tickets.map((ticket) => ({
          title,
          eyebrow: format.doors(bundle),
          code: ticket.code,
          qrToken: ticket.qrToken,
          details: [
            { label: t('myTickets.detail.holder'), value: ticket.holderName },
            { label: t('myTickets.detail.tier'), value: format.tier(bundle) },
            { label: t('myTickets.detail.entrance'), value: format.entrance(bundle) },
          ],
        })),
        `tikly-${bundle.tickets[0]?.code ?? bundle.id}`,
        t('myTickets.detail.downloadPdf'),
      );
    } catch {
      Alert.alert(t('myTickets.detail.pdfFailed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen>
      <View className="h-[52px] flex-row items-center justify-between gap-2 px-6">
        <IconButton
          icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
        />
        {brightnessRaised ? (
          <View className="h-8 flex-row items-center gap-1.5 rounded-full bg-surface px-3">
            <Ionicons name="sunny" size={16} color={colors.accent} />
            <Text variant="tag" tone="secondary" numberOfLines={1}>
              {t('myTickets.detail.brightness')}
            </Text>
          </View>
        ) : null}
        <IconButton
          icon={<Ionicons name="ellipsis-horizontal" size={20} color={colors.foreground} />}
          accessibilityLabel={t('myTickets.detail.more')}
          onPress={openMenu}
        />
      </View>

      <View className="flex-1 gap-3.5 pb-7 pt-1.5">
        <FlatList
          data={bundle.tickets}
          keyExtractor={(ticket) => ticket.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          className="grow-0"
          onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, paddingHorizontal: GUTTER }}>
              <FullTicketCard bundle={bundle} ticket={item} width={width - GUTTER * 2} />
            </View>
          )}
        />

        {total > 1 ? (
          <Text variant="captionStrong" tone="secondary" className="text-center">
            {t('myTickets.detail.ticketOf', { index: index + 1, total })}
            {index < total - 1 ? t('myTickets.detail.swipeHint') : ''}
          </Text>
        ) : null}

        <View className="mt-auto flex-row gap-2.5 px-6">
          <Button
            variant="outline"
            fullWidth={false}
            className="flex-1"
            label={t('myTickets.detail.downloadPdf')}
            icon={<Ionicons name="download-outline" size={18} color={colors.accentText} />}
            loading={exporting}
            onPress={downloadPdf}
          />
          <Button
            variant="outline"
            fullWidth={false}
            className="flex-1"
            label={t('myTickets.detail.calendar')}
            icon={<Ionicons name="calendar-outline" size={18} color={colors.accentText} />}
            onPress={addToCalendar}
          />
        </View>
      </View>
    </Screen>
  );
}
