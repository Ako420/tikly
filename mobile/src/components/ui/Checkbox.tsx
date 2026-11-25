import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';

type CheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  accessibilityLabel: string;
  invalid?: boolean;
};

export function Checkbox({ checked, onChange, label, accessibilityLabel, invalid }: CheckboxProps) {
  const { colors } = useTheme();

  return (
    <View className="flex-row items-center gap-2.5">
      <Pressable
        accessibilityRole="checkbox"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ checked }}
        onPress={() => onChange(!checked)}
        hitSlop={10}
        className={cn(
          'h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md',
          checked ? 'bg-action' : invalid ? 'border-2 border-invalid' : 'border-2 border-border',
        )}
      >
        {checked ? <Ionicons name="checkmark" size={16} color={colors.onAction} /> : null}
      </Pressable>
      <View className="flex-1">{label}</View>
    </View>
  );
}
