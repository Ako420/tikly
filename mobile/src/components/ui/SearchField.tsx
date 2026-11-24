import Ionicons from '@expo/vector-icons/Ionicons';
import { forwardRef, type ComponentRef } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { typography, useTheme } from '@/theme';
import { Text } from './Text';

type SearchFieldProps = Omit<TextInputProps, 'style' | 'placeholderTextColor'> & {
  placeholder: string;
  onPressWhenReadOnly?: () => void;
  className?: string;
};

export type SearchFieldHandle = ComponentRef<typeof TextInput>;

export const SearchField = forwardRef<SearchFieldHandle, SearchFieldProps>(function SearchField(
  { placeholder, onPressWhenReadOnly, className, value, onChangeText, ...props },
  ref,
) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const readOnly = !!onPressWhenReadOnly;
  const containerClass = cn(
    'h-[52px] flex-row items-center gap-2.5 rounded-2xl border border-border bg-surface-raised px-4',
    className,
  );
  const icon = <Ionicons name="search" size={20} color={value ? colors.foreground : colors.foregroundMuted} />;

  if (readOnly) {
    return (
      <Pressable accessibilityRole="search" accessibilityLabel={placeholder} onPress={onPressWhenReadOnly} className={containerClass}>
        {icon}
        <Text tone="muted" className="flex-1" numberOfLines={1}>
          {placeholder}
        </Text>
      </Pressable>
    );
  }

  return (
    <View className={containerClass}>
      {icon}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        accessibilityLabel={placeholder}
        placeholderTextColor={colors.foregroundMuted}
        selectionColor={colors.accentText}
        cursorColor={colors.accentText}
        returnKeyType="search"
        autoCorrect={false}
        className="h-full flex-1 text-foreground"
        style={typography.input}
        {...props}
      />
      {value ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.clear')} onPress={() => onChangeText?.('')} hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.foregroundMuted} />
        </Pressable>
      ) : null}
    </View>
  );
});
