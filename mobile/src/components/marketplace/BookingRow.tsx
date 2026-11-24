import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/theme';

type Tone = 'valid' | 'warning' | 'invalid' | 'muted';

const ICONS: Record<Tone, ComponentProps<typeof Ionicons>['name']> = {
  valid: 'checkmark-circle',
  warning: 'time',
  invalid: 'close-circle',
  muted: 'ellipse-outline',
};

type BookingRowProps = { tone: Tone; title: string; subtitle: string; trailing?: ReactNode };

export function BookingRow({ tone, title, subtitle, trailing }: BookingRowProps) {
  const { colors } = useTheme();
  const color = tone === 'muted' ? colors.foregroundMuted : colors[tone];

  return (
    <View className="flex-row items-center gap-3 rounded-[18px] border border-border bg-surface-raised p-4">
      <Ionicons name={ICONS[tone]} size={22} color={color} />
      <View className="flex-1 gap-0.5">
        <Text variant="subheading" numberOfLines={2}>
          {title}
        </Text>
        <Text variant="caption" tone="muted" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {trailing}
    </View>
  );
}
