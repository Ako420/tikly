import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';
import { ThemeScope, useTheme } from '@/theme';
import { Text } from './Text';

type Option<T extends string> = { value: T; label: string };

type OptionSheetProps<T extends string> = {
  visible: boolean;
  title: string;
  options: readonly Option<T>[];
  value: T;
  onSelect: (value: T) => void;
  onClose: () => void;
};

export function OptionSheet<T extends string>({ visible, title, options, value, onSelect, onClose }: OptionSheetProps<T>) {
  const { t } = useTranslation();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <ThemeScope scheme={scheme} className="flex-1 justify-end">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} className="absolute inset-0 bg-black/50" />
        <View className="max-h-[70%] rounded-t-[28px] border-t border-border bg-surface pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="mb-3 h-1 w-10 self-center rounded-full bg-border" />
          <Text variant="sectionTitle" accessibilityRole="header" className="px-6 pb-2">
            {title}
          </Text>
          <ScrollView contentContainerClassName="px-3">
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    onSelect(option.value);
                    onClose();
                  }}
                  className={cn('h-14 flex-row items-center justify-between rounded-2xl px-3', selected && 'bg-background')}
                >
                  <Text variant={selected ? 'subheading' : 'body'}>{option.label}</Text>
                  {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.accentText} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </ThemeScope>
    </Modal>
  );
}
