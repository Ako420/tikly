import { View } from 'react-native';
import { useTierLabels } from '@/components/events/details/TierRow';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Text } from '@/components/ui/Text';
import type { TicketTier } from '@/features/events/types';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';

type TierSelectorCardProps = {
  tier: TicketTier;
  quantity: number;
  max: number;
  onChange: (quantity: number) => void;
};

export function TierSelectorCard({ tier, quantity, max, onChange }: TierSelectorCardProps) {
  const labels = useTierLabels();
  const stock = labels.stock(tier);
  const selected = quantity > 0;

  return (
    <View
      className={cn(
        'gap-2.5 rounded-card bg-surface-raised',
        selected ? 'border-2 border-accent-text p-[13px]' : 'border border-border p-3.5',
        !stock.available && 'opacity-55',
      )}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-[3px]">
          <Text variant="title">{labels.name(tier)}</Text>
          <Text variant="caption" tone="muted">
            {labels.perk(tier)}
          </Text>
        </View>
        <Text variant="title">{formatMoney(tier.price)}</Text>
      </View>
      <View className="min-h-9 flex-row items-center justify-between">
        <Text variant="captionStrong" tone={stock.tone}>
          {stock.label}
        </Text>
        {stock.available ? (
          <QuantityStepper value={quantity} max={max} onChange={onChange} label={labels.name(tier)} />
        ) : null}
      </View>
    </View>
  );
}
