import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, type PressableProps } from 'react-native';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'outline';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  icon?: ReactNode;
  loading?: boolean;
  className?: string;
};

const containerClass: Record<ButtonVariant, string> = {
  primary: 'bg-action',
  outline: 'border-[1.5px] border-outline',
};

export function Button({ label, variant = 'primary', icon, loading, disabled, className, ...props }: ButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      className={cn(
        'h-14 w-full flex-row items-center justify-center gap-3 rounded-2xl',
        containerClass[variant],
        disabled && 'opacity-50',
        className,
      )}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onAction : colors.foreground} />
      ) : (
        <>
          {icon}
          <Text variant="button" tone={variant === 'primary' ? 'onAction' : 'primary'}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}
