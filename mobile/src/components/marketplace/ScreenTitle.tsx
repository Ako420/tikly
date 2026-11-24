import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';

export function ScreenTitle({ eyebrow, title, trailing }: { eyebrow?: string; title: string; trailing?: ReactNode }) {
  return (
    <View className="flex-row items-end justify-between gap-3">
      <View className="flex-1 gap-1">
        {eyebrow ? (
          <Text variant="eyebrow" tone="accent" numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
      </View>
      {trailing}
    </View>
  );
}
