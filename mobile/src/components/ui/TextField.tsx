import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, useState, type ComponentRef, type ReactNode } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { typography, useTheme } from '@/theme';
import { useFormScroll } from './FormScrollContext';
import { Text } from './Text';

type TextFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  label: string;
  hint?: string;
  error?: string;
  leading?: ReactNode;
  prefix?: ReactNode;
  secure?: boolean;
};

export type TextFieldHandle = ComponentRef<typeof TextInput>;

export const TextField = forwardRef<TextFieldHandle, TextFieldProps>(function TextField(
  { label, hint, error, leading, prefix, secure, onFocus, onBlur, ...props },
  ref,
) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const formScroll = useFormScroll();

  return (
    <View className="gap-1.5">
      <Text variant="bodySmStrong" tone="secondary">
        {label}
      </Text>
      <View
        className={cn(
          'h-[52px] flex-row items-center rounded-2xl bg-surface-raised',
          error ? 'border-2 border-invalid' : focused ? 'border-2 border-accent-text' : 'border border-border',
          prefix ? 'pr-4' : 'gap-2.5 px-4',
        )}
      >
        {prefix}
        {leading}
        <TextInput
          ref={ref}
          accessibilityLabel={label}
          placeholderTextColor={colors.foregroundMuted}
          selectionColor={colors.accentText}
          cursorColor={colors.accentText}
          secureTextEntry={secure && hidden}
          onFocus={(event) => {
            setFocused(true);
            formScroll?.revealFocused();
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className={cn('h-full flex-1 text-foreground', !!prefix && 'pl-3.5')}
          style={typography.input}
          {...props}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(hidden ? 'common.showPassword' : 'common.hidePassword')}
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
          >
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={20} color={colors.foregroundMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" tone="invalid">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" tone="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
});
