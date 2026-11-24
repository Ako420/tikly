import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TierSelectorCard } from '@/components/tickets/TierSelectorCard';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { Text } from '@/components/ui/Text';
import { useEventFormatter } from '@/features/events/formatEvent';
import { MAX_TICKETS_PER_ORDER } from '@/features/events/tierStock';
import { EventLoadState } from '@/components/events/EventLoadState';
import { useEventDetails } from '@/features/events/useEvents';
import { useTranslation } from '@/i18n/I18nProvider';
import { formatDateRange } from '@/lib/dates';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/theme';

type Selection = { tierId: string; quantity: number } | null;

export default function SelectTickets() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eventResource = useEventDetails(id);
  const event = eventResource.data;
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const format = useEventFormatter();
  const [selection, setSelection] = useState<Selection>(null);

  if (!event) return <EventLoadState resource={eventResource} icon="ticket-outline" />;

  const selectedTier = event.tiers.find((tier) => tier.id === selection?.tierId);
  const quantity = selection?.quantity ?? 0;
  const total = selectedTier ? selectedTier.price * quantity : 0;

  return (
    <Screen edges={['top']}>
      <View className="h-[52px] flex-row items-center justify-between px-6">
        <IconButton
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
        />
        <Text variant="eyebrow" tone="accent">
          {t('checkout.step', { step: 1, total: 2 })}
        </Text>
        <View className="h-10 w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="gap-4 px-6 pt-1"
        contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}
      >
        <Text variant="headline" accessibilityRole="header">
          {t('checkout.chooseTickets')}
        </Text>

        <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface-raised p-2.5">
          {event.coverUrl ? <Image source={{ uri: event.coverUrl }} resizeMode="cover" className="h-[60px] w-[60px] rounded-xl" /> : null}
          <View className="flex-1 gap-0.5">
            <Text variant="subheading" numberOfLines={1}>
              {format.title(event)}
            </Text>
            <Text variant="caption" tone="muted" numberOfLines={1}>
              {`${formatDateRange(event.startAt, event.endAt, language, false)} · ${event.area}`}
            </Text>
          </View>
        </View>

        <View className="gap-3">
          {event.tiers.map((tier) => {
            const tierQuantity = selection?.tierId === tier.id ? selection.quantity : 0;
            return (
              <TierSelectorCard
                key={tier.id}
                tier={tier}
                quantity={tierQuantity}
                max={Math.min(MAX_TICKETS_PER_ORDER, tier.remaining)}
                onChange={(next) => setSelection(next > 0 ? { tierId: tier.id, quantity: next } : null)}
              />
            );
          })}
        </View>

        <View className="flex-row items-start gap-2.5 rounded-[14px] bg-surface-raised p-3.5">
          <Ionicons name="information-circle" size={20} color={colors.accentText} />
          <Text variant="caption" tone="secondary" className="flex-1">
            {t('checkout.rules', { max: MAX_TICKETS_PER_ORDER })}
          </Text>
        </View>
      </ScrollView>

      <StickyActionBar
        caption={selectedTier ? `${quantity} × ${t(`tickets.tiers.${selectedTier.name}`)}` : t('checkout.noneSelected')}
        amount={formatMoney(total)}
        actionLabel={t('checkout.continue')}
        disabled={!selectedTier}
      />
    </Screen>
  );
}
