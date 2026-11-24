import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { marketplaceApi } from '@/features/marketplace/api';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import { bookingDays, estimateBooking } from '@/features/marketplace/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useNow } from '@/lib/useNow';
import { typography, useTheme } from '@/theme';

const DAY_MS = 24 * 60 * 60 * 1000;
const PICKABLE_DAYS = 180;
const MAX_QUANTITY = 500;
const NO_EVENT = 'none';

const dayKey = (date: Date) => date.toISOString().slice(0, 10);
const startOfDay = (value: Date | string) => {
  const date = new Date(value);
  date.setHours(12, 0, 0, 0);
  return date;
};

type Sheet = 'event' | 'from' | 'to' | null;

export default function BookingRequest() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const format = useMarketplaceFormat();
  const errorMessage = useApiErrorMessage();
  const service = useAsync(() => marketplaceApi.service(id), id).data;
  const events = useAsync(() => marketplaceApi.organizerEvents(), 'organizer-events').data;
  const now = useNow();
  const upcoming = useMemo(() => (events ?? []).filter((event) => new Date(event.endAt).getTime() > now), [events, now]);

  const tomorrow = useMemo(() => startOfDay(new Date(now + DAY_MS)), [now]);
  const [eventId, setEventId] = useState<string>(NO_EVENT);
  const [from, setFrom] = useState(tomorrow);
  const [to, setTo] = useState(tomorrow);
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState('');
  const [sheet, setSheet] = useState<Sheet>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string>();

  const dayOptions = useMemo(
    () =>
      Array.from({ length: PICKABLE_DAYS }, (_, index) => {
        const date = new Date(tomorrow.getTime() + index * DAY_MS);
        return { value: dayKey(date), label: format.day(date.toISOString()) };
      }),
    [tomorrow, format],
  );

  if (!service) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={colors.accentText} size="large" />
        </View>
      </Screen>
    );
  }

  const title = format.text(service.title);
  const days = bookingDays(from.toISOString(), to.toISOString());
  const estimate = estimateBooking(service.price, service.unit, quantity, days);
  const selectedEvent = upcoming.find((event) => event.id === eventId);
  const eventOptions = [
    { value: NO_EVENT, label: t('marketplace.request.noEvent') },
    ...upcoming.map((event) => ({ value: event.id, label: format.text(event.title) })),
  ];

  const pickEvent = (value: string) => {
    setEventId(value);
    const event = upcoming.find((item) => item.id === value);
    if (event) {
      const start = startOfDay(event.startAt);
      const end = startOfDay(event.endAt);
      setFrom(start < tomorrow ? tomorrow : start);
      setTo(end < tomorrow ? tomorrow : end);
    }
  };

  const pickDay = (which: 'from' | 'to', value: string) => {
    const date = startOfDay(value);
    if (which === 'from') {
      setFrom(date);
      if (to < date) setTo(date);
    } else {
      setTo(date < from ? from : date);
    }
  };

  const send = async () => {
    setSending(true);
    setError(undefined);
    try {
      await marketplaceApi.requestBooking({
        serviceId: service.id,
        eventId: selectedEvent?.id,
        startDate: from.toISOString(),
        endDate: to.toISOString(),
        quantity,
        note: note.trim() || undefined,
      });
      router.dismissTo('/bookings');
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setSending(false);
    }
  };

  const dateTile = (which: 'from' | 'to', value: Date) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t(`marketplace.request.${which}`)} ${format.day(value.toISOString())}`}
      onPress={() => setSheet(which)}
      className={`h-14 flex-1 flex-row items-center gap-2.5 rounded-2xl bg-surface-raised px-3.5 ${sheet === which ? 'border-2 border-accent-text' : 'border border-border'}`}
    >
      <Ionicons name="calendar" size={20} color={colors.accentText} />
      <View>
        <Text variant="captionSm" tone="muted">
          {t(`marketplace.request.${which}`)}
        </Text>
        <Text variant="subtitle">{format.day(value.toISOString())}</Text>
      </View>
    </Pressable>
  );

  return (
    <Screen edges={['top']}>
      <View className="h-[52px] flex-row items-center justify-between px-6">
        <IconButton
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
        />
        <Text variant="eyebrow" tone="accent">
          {t('marketplace.request.eyebrow')}
        </Text>
        <View className="h-10 w-10" />
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-4 px-6 pb-6 pt-1">
          <Text variant="headline" accessibilityRole="header">
            {t('marketplace.request.title', { category: format.category(service.category).toLowerCase() })}
          </Text>

          <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface-raised p-2.5">
            {service.photos[0] ? (
              <Image source={{ uri: service.photos[0] }} className="h-14 w-14 rounded-xl" />
            ) : (
              <View className="h-14 w-14 rounded-xl bg-surface" />
            )}
            <View className="flex-1 gap-0.5">
              <Text variant="subheading" numberOfLines={1}>
                {title}
              </Text>
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {`${service.provider.businessName} · ${formatMoney(service.price)} ${format.unit(service.unit)}`}
              </Text>
            </View>
          </View>

          <View className="gap-1.5">
            <Text variant="bodySmStrong" tone="secondary">
              {t('marketplace.request.whichEvent')}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSheet('event')}
              className="h-[52px] flex-row items-center justify-between rounded-2xl border border-border bg-surface-raised px-4"
            >
              <Text variant="itemTitle" numberOfLines={1} className="flex-1">
                {selectedEvent ? format.text(selectedEvent.title) : t('marketplace.request.noEvent')}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.foregroundMuted} />
            </Pressable>
          </View>

          <View className="gap-1.5">
            <Text variant="bodySmStrong" tone="secondary">
              {t('marketplace.request.dates')}
            </Text>
            <View className="flex-row gap-2.5">
              {dateTile('from', from)}
              {dateTile('to', to)}
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View>
              <Text variant="itemTitle">{t('marketplace.request.quantity')}</Text>
              <Text variant="caption" tone="muted">
                {format.unit(service.unit)}
              </Text>
            </View>
            <QuantityStepper
              value={quantity}
              max={MAX_QUANTITY}
              label={t('marketplace.request.quantity')}
              onChange={(value) => setQuantity(Math.max(1, value))}
            />
          </View>

          <View className="gap-1.5">
            <Text variant="bodySmStrong" tone="secondary">
              {t('marketplace.request.message')}
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={1000}
              textAlignVertical="top"
              placeholder={t('marketplace.request.messagePlaceholder')}
              placeholderTextColor={colors.foregroundMuted}
              accessibilityLabel={t('marketplace.request.message')}
              className="min-h-[72px] rounded-2xl border border-border bg-surface-raised p-3.5"
              style={[typography.input, { color: colors.foreground }]}
            />
          </View>

          <View className="flex-row items-center justify-between rounded-2xl border border-border bg-surface-raised p-3.5">
            <Text variant="bodySm" tone="secondary" className="flex-1">
              {service.unit === 'per_day'
                ? t('marketplace.request.estimateDays', { price: formatMoney(service.price), quantity, days })
                : t('marketplace.request.estimateItems', { price: formatMoney(service.price), quantity })}
            </Text>
            <Text variant="amountLg">{formatMoney(estimate)}</Text>
          </View>

          {error ? (
            <Text variant="bodySm" tone="invalid" accessibilityLiveRegion="polite">
              {error}
            </Text>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      <View className="gap-2 border-t border-border bg-surface-raised px-6 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <View className="flex-row items-center justify-center gap-1.5">
          <Ionicons name="information-circle" size={14} color={colors.foregroundMuted} />
          <Text variant="captionSm" tone="muted">
            {t('marketplace.request.payLater', { provider: service.provider.businessName })}
          </Text>
        </View>
        <Button label={t('marketplace.request.send')} loading={sending} onPress={send} />
      </View>

      <OptionSheet
        visible={sheet === 'event'}
        title={t('marketplace.request.whichEvent')}
        options={eventOptions}
        value={eventId}
        onSelect={(value) => {
          pickEvent(value);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        visible={sheet === 'from' || sheet === 'to'}
        title={t(`marketplace.request.${sheet === 'to' ? 'to' : 'from'}`)}
        options={dayOptions}
        value={dayKey(sheet === 'to' ? to : from)}
        onSelect={(value) => {
          if (sheet === 'from' || sheet === 'to') pickDay(sheet, value);
          setSheet(null);
        }}
        onClose={() => setSheet(null)}
      />
    </Screen>
  );
}
