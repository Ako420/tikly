import type { ReactNode } from 'react';
import { PressableScale } from '@/components/motion/PressableScale';
import { Text } from './Text';

type PillButtonProps = {
  label: string;
  icon?: ReactNode;
  onPress?: () => void;
};

export function PillButton({ label, icon, onPress }: PillButtonProps) {
  return (
    <PressableScale
      accessibilityRole="button"
      onPress={onPress}
      className="h-11 flex-row items-center gap-2 rounded-full border border-border bg-surface-raised px-4"
    >
      {icon}
      <Text variant="bodySmStrong">{label}</Text>
    </PressableScale>
  );
}
