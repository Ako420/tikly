import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import { Text } from './Text';

type PillButtonProps = {
  label: string;
  icon?: ReactNode;
  onPress?: () => void;
};

export function PillButton({ label, icon, onPress }: PillButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-11 flex-row items-center gap-2 rounded-full border border-border bg-surface-raised px-4"
      style={({ pressed }) => (pressed ? { opacity: 0.8 } : null)}
    >
      {icon}
      <Text variant="bodySmStrong">{label}</Text>
    </Pressable>
  );
}
