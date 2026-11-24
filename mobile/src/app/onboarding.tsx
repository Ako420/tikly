import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { Image, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Logo } from '@/components/brand/Logo';
import { TicketPreview } from '@/components/tickets/TicketPreview';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { PagerDots } from '@/components/ui/PagerDots';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n/I18nProvider';
import { ThemeScope, useTheme, withAlpha } from '@/theme';

const heroImage = {
  uri: 'https://cdn.wonder.so/images/01a20a1c-76f1-7172-82d3-2a99389b8276/6688e779c148f3bce252968f73fa93e1dc1dd9a259ee5263b0d0e9145c7aee67.jpg',
};

export default function OnboardingDiscover() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-background">
      <StatusBar style="light" />
      <View className="h-[440px]" style={{ paddingTop: insets.top }}>
        <Image source={heroImage} resizeMode="cover" className="absolute inset-0" accessibilityIgnoresInvertColors />
        <LinearGradient
          colors={[colors.media, withAlpha(colors.media, 0)]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160, opacity: 0.8 }}
        />
        <LinearGradient
          colors={[withAlpha(colors.background, 0), colors.background]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 240 }}
        />
        <ThemeScope scheme="dark" className="h-12 flex-row items-center justify-between px-6">
          <Logo />
          <LanguageToggle />
        </ThemeScope>
        <TicketPreview
          eyebrow={t('onboarding.discover.ticket.eyebrow')}
          title={t('onboarding.discover.ticket.title')}
          venue={t('onboarding.discover.ticket.venue')}
          tier={t('tickets.tiers.standard')}
          price={2000}
          className="absolute bottom-[18px] left-7 right-7 -rotate-3"
        />
      </View>
      <View className="flex-1 gap-6 px-6 pt-6" style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}>
        <View className="gap-3">
          <Text variant="eyebrow" tone="accent">
            {t('onboarding.discover.eyebrow')}
          </Text>
          <Text variant="display" accessibilityRole="header">
            {t('onboarding.discover.title')}
          </Text>
          <Text tone="secondary">{t('onboarding.discover.body')}</Text>
        </View>
        <PagerDots count={3} active={0} />
        <View className="mt-auto gap-3">
          <Button label={t('onboarding.getStarted')} />
          <Button label={t('onboarding.haveAccount')} variant="outline" />
        </View>
      </View>
    </View>
  );
}
