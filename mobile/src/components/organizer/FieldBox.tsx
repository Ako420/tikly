import { forwardRef, type ComponentRef } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { cn } from '@/lib/cn';
import { typography, useTheme } from '@/theme';

type FieldBoxProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & { error?: boolean; className?: string; highlighted?: boolean };

export const FieldBox = forwardRef<ComponentRef<typeof TextInput>, FieldBoxProps>(function FieldBox({ error, className, highlighted, multiline, ...props }, ref) {
  const { colors } = useTheme();
  return (
    <TextInput
      ref={ref}
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'center'}
      placeholderTextColor={colors.foregroundMuted}
      className={cn(
        'rounded-2xl bg-surface-raised px-4',
        multiline ? 'min-h-[110px] py-3.5' : 'h-14',
        error ? 'border-2 border-invalid' : highlighted ? 'border-2 border-accent' : 'border border-border',
        className,
      )}
      style={[typography.input, { color: colors.foreground }]}
      {...props}
    />
  );
});
