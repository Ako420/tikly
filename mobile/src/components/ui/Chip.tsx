import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';
import { PressableScale } from '@/components/motion/PressableScale';
import { Text } from './Text';

type ChipProps = {
  label: string;
  selected?: boolean;
  icon?: ComponentProps<typeof MaterialCommunityIcons>['name'];
  trailing?: 'remove' | 'expand';
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Chip({ label, selected, icon, trailing, onPress, accessibilityLabel }: ChipProps) {
  const { colors } = useTheme();
  const foreground = selected ? colors.onAction : colors.foreground;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      className={cn(
        'h-10 shrink-0 flex-row items-center gap-1.5 rounded-full px-3.5',
        selected ? 'bg-action' : 'border border-border bg-surface-raised',
      )}
    >
      {icon ? <MaterialCommunityIcons name={icon} size={16} color={selected ? foreground : colors.accentText} /> : null}
      <Text variant={selected ? 'link' : 'bodySmStrong'} tone={selected ? 'onAction' : 'primary'}>
        {label}
      </Text>
      {trailing === 'remove' ? <Ionicons name="close" size={14} color={foreground} /> : null}
      {trailing === 'expand' ? (
        <Ionicons name="chevron-down" size={14} color={selected ? foreground : colors.foregroundMuted} />
      ) : null}
    </PressableScale>
  );
}
