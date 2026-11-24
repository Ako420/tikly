import Ionicons from '@expo/vector-icons/Ionicons';
import { Modal, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@/i18n/I18nProvider';
import { ThemeScope, useTheme } from '@/theme';
import { Text } from './Text';

export type SheetAction = {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

type ActionSheetProps = {
  visible: boolean;
  title?: string;
  actions: SheetAction[];
  onClose: () => void;
};

export function ActionSheet({ visible, title, actions, onClose }: ActionSheetProps) {
  const { t } = useTranslation();
  const { scheme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <ThemeScope scheme={scheme} className="flex-1 justify-end">
        <Pressable accessibilityRole="button" accessibilityLabel={t('common.close')} onPress={onClose} className="absolute inset-0 bg-black/50" />
        <View className="rounded-t-[28px] border-t border-border bg-surface px-3 pt-3" style={{ paddingBottom: insets.bottom + 12 }}>
          <View className="mb-2 h-1 w-10 self-center rounded-full bg-border" />
          {title ? (
            <Text variant="eyebrow" tone="muted" className="px-3 pb-2" numberOfLines={1}>
              {title}
            </Text>
          ) : null}
          {actions.map((action) => (
            <Pressable
              key={action.key}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                action.onPress();
              }}
              className="h-14 flex-row items-center gap-3.5 rounded-2xl px-3 active:bg-background"
            >
              <Ionicons name={action.icon} size={22} color={action.destructive ? colors.invalid : colors.foregroundSecondary} />
              <Text variant="subheading" tone={action.destructive ? 'invalid' : 'primary'}>
                {action.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </ThemeScope>
    </Modal>
  );
}
