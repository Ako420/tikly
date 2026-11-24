import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { LanguageToggle } from './LanguageToggle';

export function NavBar({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View className="h-[52px] flex-row items-center justify-between px-6">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
        onPress={onBack ?? (() => router.back())}
        hitSlop={8}
        className="h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-raised"
        style={({ pressed }) => (pressed ? { opacity: 0.7 } : null)}
      >
        <Ionicons name="chevron-back" size={20} color={colors.foreground} />
      </Pressable>
      <LanguageToggle />
    </View>
  );
}
