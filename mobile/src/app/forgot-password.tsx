import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { FormScreen } from '@/components/ui/FormScreen';
import { LinkPrompt } from '@/components/ui/LinkPrompt';
import { ScreenHeading } from '@/components/ui/ScreenHeading';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { authApi } from '@/features/auth/api';
import { PASSWORD_RESET_LINK_HOURS } from '@/features/auth/passwordReset';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { isEmail } from '@/lib/validation';
import { useTheme } from '@/theme';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const errorMessage = useApiErrorMessage();
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState(params.email ?? '');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string>();
  const error = submitted && !isEmail(email.trim()) ? t('auth.errors.emailInvalid') : undefined;

  const send = async () => {
    setSubmitted(true);
    const value = email.trim();
    if (!isEmail(value) || sending) return;
    setSending(true);
    setFormError(undefined);
    try {
      await authApi.forgotPassword(value);
      router.push({ pathname: '/reset-link-sent', params: { email: value } });
    } catch (caught) {
      setFormError(errorMessage(caught));
    } finally {
      setSending(false);
    }
  };

  return (
    <FormScreen contentClassName="gap-[22px] pt-2">
      <ScreenHeading
        eyebrow={t('auth.reset.eyebrow')}
        title={t('auth.reset.title')}
        subtitle={t('auth.reset.body', { hours: PASSWORD_RESET_LINK_HOURS })}
      />
      <View className="gap-5">
        <TextField
          label={t('auth.fields.email')}
          value={email}
          onChangeText={setEmail}
          error={error}
          leading={<Ionicons name="mail-outline" size={20} color={colors.foregroundMuted} />}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="send"
          onSubmitEditing={send}
        />
        {formError ? (
          <Text variant="bodySm" tone="invalid" accessibilityRole="alert">
            {formError}
          </Text>
        ) : null}
        <Button label={t('auth.reset.send')} onPress={send} loading={sending} />
      </View>
      <View className="mt-auto items-center pt-2">
        <LinkPrompt prompt={t('auth.reset.remembered')} action={t('auth.reset.backToLogin')} onPress={() => router.dismissTo('/login')} />
      </View>
    </FormScreen>
  );
}
