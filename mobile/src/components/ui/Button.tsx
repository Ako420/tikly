import { Pressable, type PressableProps } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from './Text';

type ButtonVariant = 'primary' | 'outline';

type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ButtonVariant;
  className?: string;
};

const containerClass: Record<ButtonVariant, string> = {
  primary: 'bg-action',
  outline: 'border-[1.5px] border-outline',
};

export function Button({ label, variant = 'primary', disabled, className, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      className={cn('h-14 w-full items-center justify-center rounded-2xl', containerClass[variant], disabled && 'opacity-50', className)}
      style={({ pressed }) => (pressed ? { opacity: 0.85 } : null)}
      {...props}
    >
      <Text variant="button" tone={variant === 'primary' ? 'onAction' : 'primary'}>
        {label}
      </Text>
    </Pressable>
  );
}
