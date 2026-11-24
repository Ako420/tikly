import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';
import { IconButton } from './IconButton';
import { LanguageToggle } from './LanguageToggle';

export function NavBar({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View className="h-[52px] flex-row items-center justify-between px-6">
      <IconButton
        accessibilityLabel={t('common.back')}
        onPress={onBack ?? (() => router.back())}
        icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
      />
      <LanguageToggle />
    </View>
  );
}
