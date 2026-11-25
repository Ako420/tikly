import type { ReactNode } from 'react';
import { ActivityIndicator, type PressableProps } from 'react-native';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';
import { haptic } from '@/lib/motion';
import { PressableScale } from '@/components/motion/PressableScale';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'outline' | 'secondary' | 'danger';
type ButtonSize = 'lg' | 'md';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
};

const containerClass: Record<ButtonVariant, string> = {
  primary: 'bg-action',
  outline: 'border-[1.5px] border-outline',
  secondary: 'border border-border bg-surface-raised',
  danger: 'bg-danger',
};

const sizeClass: Record<ButtonSize, string> = {
  lg: 'h-14 rounded-2xl',
  md: 'h-12 rounded-[14px]',
};

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  icon,
  loading,
  fullWidth = true,
  disabled,
  className,
  onPress,
  ...props
}: ButtonProps) {
  const { colors } = useTheme();
  const inactive = disabled || loading;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      className={cn(
        'flex-row items-center justify-center gap-3 px-4',
        fullWidth && 'w-full',
        sizeClass[size],
        containerClass[variant],
        disabled && 'opacity-50',
        className,
      )}
      {...props}
      onPress={(event) => {
        if (variant === 'primary' || variant === 'danger') haptic.tap();
        onPress?.(event);
      }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? colors.onAction : variant === 'danger' ? colors.onDanger : colors.foreground} />
      ) : (
        <>
          {icon}
          <Text variant={size === 'md' ? 'itemTitle' : 'button'} tone={variant === 'primary' ? 'onAction' : variant === 'danger' ? 'onDanger' : 'primary'}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}
