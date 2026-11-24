import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, View, useWindowDimensions } from 'react-native';
import { CancelTicketSheet } from '@/components/tickets/CancelTicketSheet';
import { FullTicketCard } from '@/components/tickets/FullTicketCard';
import { ActionSheet, type SheetAction } from '@/components/ui/ActionSheet';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import type { IssuedTicket } from '@/features/orders/types';
import { useTicketFormatter } from '@/features/tickets/formatTicket';
import { cancelTickets } from '@/features/tickets/ticketActions';
import { shareTicketsPdf } from '@/features/tickets/ticketPdf';
import { useTicketBundle } from '@/features/tickets/useMyTickets';
import { useScanBrightness } from '@/features/tickets/useScanBrightness';
import { activeTickets, cancellableTickets, isPastBundle, refundFor, ticketPrice } from '@/features/tickets/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { googleCalendarUrl } from '@/lib/share';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme';

const GUTTER = 24;
const DEFAULT_EVENT_MS = 6 * 60 * 60 * 1000;

export default function TicketDetail() {
  const { bundleId } = useLocalSearchParams<{ bundleId: string }>();
  const { bundle, loading, refresh } = useTicketBundle(bundleId);
  const errorMessage = useApiErrorMessage();
  const now = useNow();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const format = useTicketFormatter();
  const brightnessRaised = useScanBrightness();
  const [index, setIndex] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string>();

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
  const tickets = activeTickets(bundle);
  const total = tickets.length;
  const refundable = cancellableTickets(bundle, now);

  const confirmCancel = async (ticket: IssuedTicket) => {
    setCancelling(true);
    setCancelError(undefined);
    try {
      await cancelTickets(bundle, [ticket.id]);
      await refresh();
      setCancelOpen(false);
      setIndex(0);
      Alert.alert(t('myTickets.cancel.doneTitle'), t('myTickets.cancel.doneBody', { amount: formatMoney(refundFor(ticketPrice(bundle, ticket))) }));
      if (total <= 1) router.back();
    } catch (caught) {
      setCancelError(errorMessage(caught));
    } finally {
      setCancelling(false);
    }
  };

  const menuActions: SheetAction[] = [
    {
      key: 'event',
      label: t('myTickets.detail.viewEvent'),
      icon: 'calendar-outline',
      onPress: () => router.push({ pathname: '/events/[id]', params: { id: bundle.event.id } }),
    },
    ...(bundle.checkedInAt && isPastBundle(bundle, now)
      ? [
          {
            key: 'review',
            label: t('myTickets.detail.rateEvent'),
            icon: 'star-outline' as const,
            onPress: () => router.push({ pathname: '/tickets/[bundleId]/review', params: { bundleId: bundle.id } }),
          },
        ]
      : []),
    ...(refundable.length > 0
      ? [{ key: 'cancel', label: t('myTickets.detail.cancelTicket'), icon: 'close-circle-outline' as const, destructive: true, onPress: () => setCancelOpen(true) }]
      : []),
  ];

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
        tickets.map((ticket) => ({
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
        `tikly-${tickets[0]?.code ?? bundle.id}`,
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
          onPress={() => setMenuOpen(true)}
        />
      </View>

      <View className="flex-1 gap-3.5 pb-7 pt-1.5">
        <FlatList
          data={tickets}
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
      <ActionSheet visible={menuOpen} title={title} actions={menuActions} onClose={() => setMenuOpen(false)} />
      {refundable.length > 0 ? (
        <CancelTicketSheet
          key={refundable.map((ticket) => ticket.id).join()}
          bundle={bundle}
          tickets={refundable}
          visible={cancelOpen}
          cancelling={cancelling}
          error={cancelError}
          onClose={() => setCancelOpen(false)}
          onConfirm={confirmCancel}
        />
      ) : null}
    </Screen>
  );
}
