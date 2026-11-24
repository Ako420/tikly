import { router } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';
import { LogoMark } from '@/components/brand/LogoMark';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n/I18nProvider';

const SPLASH_DURATION_MS = 1800;

export default function Splash() {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(() => router.replace('/onboarding'), SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Screen>
      <View className="flex-1 items-center justify-center gap-5">
        <View className="absolute h-[420px] w-[420px] rounded-full border border-border opacity-60" />
        <View className="absolute h-[280px] w-[280px] rounded-full border border-border" />
        <LogoMark size="lg" />
        <View className="items-center gap-1.5">
          <Text variant="wordmarkXl">{t('common.appName')}</Text>
          <Text tone="secondary">{t('splash.tagline')}</Text>
        </View>
      </View>
      <View className="h-20 items-center justify-center">
        <Text variant="eyebrow" tone="accent">
          {t('splash.footer')}
        </Text>
      </View>
    </Screen>
  );
}
