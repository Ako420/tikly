import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { cn } from '@/lib/cn';

type IconButtonProps = {
  icon: ReactNode;
  accessibilityLabel: string;
  onPress?: () => void;
  size?: 'md' | 'lg';
  badge?: boolean;
  className?: string;
};

export function IconButton({ icon, accessibilityLabel, onPress, size = 'md', badge, className }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      hitSlop={6}
      className={cn(
        'relative items-center justify-center rounded-full border border-border bg-surface-raised',
        size === 'lg' ? 'h-11 w-11' : 'h-10 w-10',
        className,
      )}
      style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
    >
      {icon}
      {badge ? (
        <View className="absolute right-[11px] top-2.5 h-[9px] w-[9px] rounded-full border-2 border-surface-raised bg-accent-text" />
      ) : null}
    </Pressable>
  );
}
