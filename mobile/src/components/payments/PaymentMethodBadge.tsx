import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { paymentMethods } from '@/features/orders/paymentMethods';
import type { PaymentMethod } from '@/features/orders/types';

export function PaymentMethodBadge({ method }: { method: PaymentMethod }) {
  const meta = paymentMethods[method];

  return (
    <View className="self-start rounded-lg px-2 py-1" style={{ backgroundColor: meta.badgeBackground }}>
      <Text variant="label" style={{ color: meta.badgeForeground }}>
        {meta.badge}
      </Text>
    </View>
  );
}
