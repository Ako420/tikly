import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import { PreviewCard } from '@/components/ui/PreviewCard';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { formatMoney } from '@/lib/money';
import { semanticColors } from '@/theme';

type PaymentPreviewProps = {
  title: string;
  meta: string;
  amount: number;
  holdLabel: string;
  holdValue: string;
  className?: string;
};

export function PaymentPreview({ title, meta, amount, holdLabel, holdValue, className }: PaymentPreviewProps) {
  return (
    <PreviewCard className={cn('gap-3 p-4', className)}>
      <View className="flex-row items-center gap-3">
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface">
          <MaterialCommunityIcons name="cellphone" size={22} color={semanticColors.light.primary} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text variant="subtitle" numberOfLines={1}>
            {title}
          </Text>
          <Text variant="caption" tone="secondary" numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Text variant="amount">{formatMoney(amount)}</Text>
      </View>
      <View className="h-9 flex-row items-center justify-between rounded-logo-sm bg-surface px-3">
        <Text variant="caption" tone="secondary">
          {holdLabel}
        </Text>
        <Text variant="label" tone="accent">
          {holdValue}
        </Text>
      </View>
    </PreviewCard>
  );
}
