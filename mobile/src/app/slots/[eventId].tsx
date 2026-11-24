import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListFallback } from '@/components/marketplace/LoadingList';
import { EventSummaryCard } from '@/components/events/EventSummaryCard';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { eventsApi } from '@/features/events/api';
import { exhibitorApi } from '@/features/exhibitor/api';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { formatDateRange } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme';

const MAX_SLOTS_PER_ORDER = 20;
const FEW_LEFT = 5;

export default function SlotBooking() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const format = useMarketplaceFormat();
  const event = useAsync(() => eventsApi.get(eventId), `event-${eventId}`).data;
  const slots = useAsync(() => exhibitorApi.slots(eventId), `slots-${eventId}`);
  const [selection, setSelection] = useState<{ slotId: string; quantity: number }>();

  const items = slots.data ?? [];
  const chosen = items.find((slot) => slot.id === selection?.slotId);
  const quantity = chosen ? selection!.quantity : 0;
  const total = chosen ? chosen.price * quantity : 0;
  const eventTitle = event ? format.text(event.title) : '';

  const book = () => {
    if (!chosen) return;
    router.push({
      pathname: '/pay',
      params: {
        kind: 'slot',
        ref: chosen.id,
        qty: String(quantity),
        amount: String(total),
        title: `${quantity} × ${chosen.label}`,
        subtitle: eventTitle,
      },
    });
  };

  return (
    <Screen edges={['top']}>
      <View className="h-[52px] flex-row items-center justify-between px-6">
        <IconButton
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
        />
        <Text variant="eyebrow" tone="accent">
          {t('exhibitor.bookEyebrow')}
        </Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView contentContainerClassName="gap-3.5 px-6 pb-6 pt-1">
        <Text variant="headline" accessibilityRole="header">
          {t('exhibitor.chooseTitle')}
        </Text>
        {event ? (
          <EventSummaryCard
            title={eventTitle}
            meta={`${formatDateRange(event.startAt, event.endAt, language, false)} · ${event.venue}`}
            coverUrl={event.coverUrl}
          />
        ) : null}

        {items.length === 0 ? (
          <ListFallback
            loading={slots.loading}
            error={slots.error}
            onRetry={slots.reload}
            icon="storefront-outline"
            emptyTitle={t('exhibitor.noSlotsTitle')}
            emptyBody={t('exhibitor.noSlotsBody')}
          />
        ) : null}

        {items.map((slot) => {
          const soldOut = slot.available <= 0;
          const value = slot.id === selection?.slotId ? selection.quantity : 0;
          const max = Math.min(slot.available, MAX_SLOTS_PER_ORDER);
          return (
            <View
              key={slot.id}
              className={cn(
                'gap-2 rounded-[18px] bg-surface-raised p-4',
                value > 0 ? 'border-2 border-accent' : 'border border-border',
                soldOut && 'opacity-50',
              )}
            >
              <View className="flex-row items-start justify-between gap-3">
                <Text variant="title" className="flex-1">
                  {slot.label}
                </Text>
                <Text variant="amount">{slot.price === 0 ? t('events.free') : formatMoney(slot.price)}</Text>
              </View>
              {slot.size ? (
                <Text variant="bodySm" tone="muted">
                  {slot.size}
                </Text>
              ) : null}
              <View className="flex-row items-center justify-between">
                <Text variant="bodySmStrong" tone={soldOut ? 'muted' : slot.available <= FEW_LEFT ? 'warning' : 'valid'}>
                  {soldOut
                    ? t('tickets.stock.soldOut')
                    : slot.available <= FEW_LEFT
                      ? t('exhibitor.onlyLeft', { count: slot.available })
                      : t('exhibitor.slotLeft', { count: slot.available })}
                </Text>
                {soldOut ? null : (
                  <QuantityStepper
                    value={value}
                    max={max}
                    label={slot.label}
                    onChange={(next) => setSelection(next > 0 ? { slotId: slot.id, quantity: next } : undefined)}
                  />
                )}
              </View>
            </View>
          );
        })}

        {items.length > 0 ? (
          <View className="flex-row items-start gap-2.5 rounded-2xl bg-surface p-4">
            <Ionicons name="information-circle" size={20} color={colors.accentText} />
            <Text variant="bodySm" tone="secondary" className="flex-1">
              {t('exhibitor.listedNote', { name: user?.name ?? '' })}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      <View
        className="flex-row items-center gap-4 border-t border-border bg-surface-raised px-6 pt-3.5"
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
      >
        <View className="gap-0.5">
          <Text variant="caption" tone="muted">
            {chosen ? `${quantity} × ${chosen.label}` : t('exhibitor.pickStand')}
          </Text>
          <Text variant="amountLg">{formatMoney(total)}</Text>
        </View>
        <Button label={t('exhibitor.bookAndPay')} disabled={!chosen} onPress={book} fullWidth={false} className="flex-1" />
      </View>
    </Screen>
  );
}
