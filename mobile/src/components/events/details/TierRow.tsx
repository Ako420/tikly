import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { getTierStock } from '@/features/events/tierStock';
import { localize, type TicketTier } from '@/features/events/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';

export function useTierLabels() {
  const { t, language } = useTranslation();
  return {
    name: (tier: TicketTier) => t(`tickets.tiers.${tier.name}`),
    perk: (tier: TicketTier) => localize(tier.perk, language),
    stock: (tier: TicketTier) => {
      const stock = getTierStock(tier);
      return { ...stock, label: t(`tickets.stock.${stock.key}`, { count: tier.remaining }) };
    },
  };
}

export function TierRow({ tier }: { tier: TicketTier }) {
  const labels = useTierLabels();
  const stock = labels.stock(tier);

  return (
    <View
      className={cn('flex-row items-center gap-3 rounded-2xl border border-border bg-surface-raised p-3.5', !stock.available && 'opacity-60')}
      accessible
      accessibilityLabel={`${labels.name(tier)}, ${labels.perk(tier)}, ${formatMoney(tier.price)}, ${stock.label}`}
    >
      <View className="flex-1 gap-[3px]">
        <Text variant="subheading">{labels.name(tier)}</Text>
        <Text variant="caption" tone="muted">
          {labels.perk(tier)}
        </Text>
      </View>
      <View className="items-end gap-[3px]">
        <Text variant="amount">{formatMoney(tier.price)}</Text>
        <Text variant="captionStrong" tone={stock.tone}>
          {stock.label}
        </Text>
      </View>
    </View>
  );
}
