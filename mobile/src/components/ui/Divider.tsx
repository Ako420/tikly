import { View } from 'react-native';
import { Text } from './Text';

export function Divider({ label }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-3">
      <View className="h-px flex-1 bg-border" />
      {label ? (
        <Text variant="caption" tone="muted">
          {label}
        </Text>
      ) : null}
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}
