import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { FormScreen } from '@/components/ui/FormScreen';
import { LinkPrompt } from '@/components/ui/LinkPrompt';
import { ScreenHeading } from '@/components/ui/ScreenHeading';
import { Text } from '@/components/ui/Text';
import { authApi } from '@/features/auth/api';
import { PASSWORD_RESET_LINK_HOURS, RESEND_COOLDOWN_SECONDS } from '@/features/auth/passwordReset';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { useTheme } from '@/theme';

const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export default function ResetLinkSent() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const errorMessage = useApiErrorMessage();
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState<{ tone: 'valid' | 'invalid'; text: string }>();

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    if (cooldown > 0 || resending || !email) return;
    setResending(true);
    setMessage(undefined);
    try {
      await authApi.forgotPassword(email);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setMessage({ tone: 'valid', text: t('auth.reset.resent') });
    } catch (caught) {
      setMessage({ tone: 'invalid', text: errorMessage(caught) });
    } finally {
      setResending(false);
    }
  };

  return (
    <FormScreen contentClassName="gap-[22px] pt-2">
      <View className="h-[118px] w-[118px] items-center justify-center rounded-full border border-border">
        <View className="h-[88px] w-[88px] items-center justify-center rounded-full bg-accent">
          <Ionicons name="mail-open" size={40} color={colors.onAccent} />
        </View>
      </View>
      <ScreenHeading
        eyebrow={t('auth.reset.sentEyebrow')}
        title={t('auth.reset.sentTitle')}
        subtitle={t('auth.reset.sentBody', { email, hours: PASSWORD_RESET_LINK_HOURS })}
      />
      <View className="gap-3.5">
        <Button label={t('auth.reset.openEmail')} onPress={() => Linking.openURL('mailto:').catch(() => undefined)} />
        <Button
          variant="outline"
          label={cooldown > 0 ? t('auth.reset.resendIn', { time: formatCountdown(cooldown) }) : t('auth.reset.resend')}
          onPress={resend}
          loading={resending}
          disabled={cooldown > 0}
        />
        {message ? (
          <Text variant="bodySm" tone={message.tone} className="text-center" accessibilityLiveRegion="polite">
            {message.text}
          </Text>
        ) : null}
      </View>
      <View className="mt-auto items-center pt-2">
        <LinkPrompt
          prompt={t('auth.reset.wrongEmail')}
          action={t('auth.reset.changeIt')}
          onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/forgot-password', params: { email } }))}
        />
      </View>
    </FormScreen>
  );
}
