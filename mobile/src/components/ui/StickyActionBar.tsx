import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Text } from './Text';

type StickyActionBarProps = {
  caption: string;
  amount: string;
  actionLabel: string;
  onAction?: () => void;
  disabled?: boolean;
};

export function StickyActionBar({ caption, amount, actionLabel, onAction, disabled }: StickyActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="absolute bottom-0 left-0 right-0 flex-row items-center gap-4 border-t border-border bg-surface-raised px-6 pt-3.5"
      style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
    >
      <View className="gap-0.5">
        <Text variant="caption" tone="muted">
          {caption}
        </Text>
        <Text variant="amountLg" numberOfLines={1}>
          {amount}
        </Text>
      </View>
      <Button label={actionLabel} onPress={onAction} disabled={disabled} fullWidth={false} className="flex-1" />
    </View>
  );
}
