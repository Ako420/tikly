import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { paymentMethods } from '@/features/orders/paymentMethods';
import type { PaymentMethod } from '@/features/orders/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { PaymentMethodBadge } from './PaymentMethodBadge';

type PaymentMethodCardProps = {
  method: PaymentMethod;
  selected: boolean;
  onPress: () => void;
};

export function PaymentMethodCard({ method, selected, onPress }: PaymentMethodCardProps) {
  const { t } = useTranslation();
  const name = t(`payments.methods.${method}`);

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${name}, ${paymentMethods[method].prefixesLabel}`}
      onPress={onPress}
      className={cn(
        'min-h-[124px] flex-1 gap-3 rounded-card bg-surface-raised',
        selected ? 'border-2 border-accent-text p-[13px]' : 'border border-border p-3.5',
      )}
    >
      <View className="flex-row items-start justify-between">
        <PaymentMethodBadge method={method} />
        <View
          className={cn(
            'h-[22px] w-[22px] rounded-full',
            selected ? 'border-[6px] border-accent-text bg-background' : 'border-2 border-border',
          )}
        />
      </View>
      <View className="gap-1">
        <Text variant="subheading">{name}</Text>
        <Text variant="captionSm" tone="muted">
          {paymentMethods[method].prefixesLabel}
        </Text>
      </View>
    </Pressable>
  );
}
