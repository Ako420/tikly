import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n/I18nProvider';
import { LogoMark } from './LogoMark';

export function Logo() {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-2">
      <LogoMark size="sm" />
      <Text variant="wordmark">{t('common.appName')}</Text>
    </View>
  );
}
