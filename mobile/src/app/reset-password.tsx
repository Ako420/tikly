import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { FormScreen } from '@/components/ui/FormScreen';
import { LinkPrompt } from '@/components/ui/LinkPrompt';
import { ScreenHeading } from '@/components/ui/ScreenHeading';
import { Text } from '@/components/ui/Text';
import { TextField, type TextFieldHandle } from '@/components/ui/TextField';
import { authApi } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { homeRouteFor } from '@/features/auth/homeRoute';
import { passwordStrength, type PasswordStrength } from '@/features/auth/passwordReset';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { MIN_PASSWORD_LENGTH } from '@/lib/validation';
import { useTheme } from '@/theme';

const STRENGTH_LEVELS = 4;

const strengthTone: Record<PasswordStrength, 'invalid' | 'warning' | 'valid' | 'muted'> = {
  0: 'muted',
  1: 'invalid',
  2: 'warning',
  3: 'valid',
  4: 'valid',
};

const strengthBar: Record<PasswordStrength, string> = {
  0: 'bg-border',
  1: 'bg-invalid',
  2: 'bg-warning',
  3: 'bg-valid',
  4: 'bg-valid',
};

export default function ResetPassword() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { signIn } = useAuth();
  const errorMessage = useApiErrorMessage();
  const { token, email } = useLocalSearchParams<{ token?: string; email?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string>();
  const confirmRef = useRef<TextFieldHandle>(null);
  const strength = passwordStrength(password);
  const tooShort = password.length < MIN_PASSWORD_LENGTH;
  const matches = confirm.length > 0 && confirm === password;

  const passwordError = submitted && tooShort ? t('auth.errors.passwordShort', { min: MIN_PASSWORD_LENGTH }) : undefined;
  const confirmError = submitted && !matches ? t('auth.reset.mismatch') : undefined;

  const save = async () => {
    setSubmitted(true);
    if (!token || tooShort || !matches || saving) return;
    setSaving(true);
    setFormError(undefined);
    try {
      await authApi.resetPassword(token, password);
      if (email) {
        const user = await signIn({ identifier: email, password });
        router.replace(homeRouteFor(user));
      } else {
        router.replace('/login');
      }
    } catch (caught) {
      setFormError(errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  if (!token) {
    return (
      <FormScreen contentClassName="gap-[22px] pt-2">
        <ScreenHeading eyebrow={t('auth.reset.eyebrow')} title={t('auth.reset.invalidTitle')} subtitle={t('auth.reset.invalidBody')} />
        <Button label={t('auth.reset.requestNew')} onPress={() => router.replace('/forgot-password')} />
      </FormScreen>
    );
  }

  return (
    <FormScreen contentClassName="gap-[22px] pt-2">
      <ScreenHeading
        eyebrow={t('auth.reset.newEyebrow')}
        title={t('auth.reset.newTitle')}
        subtitle={t(email ? 'auth.reset.newBody' : 'auth.reset.newBodyNoLogin', { min: MIN_PASSWORD_LENGTH })}
      />
      <View className="gap-2.5">
        <TextField
          label={t('auth.reset.newPassword')}
          value={password}
          onChangeText={setPassword}
          error={passwordError}
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
          onSubmitEditing={() => confirmRef.current?.focus()}
          submitBehavior="submit"
        />
        {password.length > 0 ? (
          <View className="gap-1.5" accessible accessibilityLabel={t(`auth.reset.strength.${strength}`)}>
            <View className="flex-row gap-1.5">
              {Array.from({ length: STRENGTH_LEVELS }, (_, index) => (
                <View key={index} className={cn('h-1.5 flex-1 rounded-full', index < strength ? strengthBar[strength] : 'bg-border')} />
              ))}
            </View>
            <Text variant="captionStrong" tone={strengthTone[strength]}>
              {t(`auth.reset.strength.${strength}`)}
            </Text>
          </View>
        ) : null}
      </View>
      <View className="gap-2.5">
        <TextField
          ref={confirmRef}
          label={t('auth.reset.confirmPassword')}
          value={confirm}
          onChangeText={setConfirm}
          error={confirmError}
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={save}
        />
        {matches ? (
          <View className="flex-row items-center gap-2" accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={18} color={colors.valid} />
            <Text variant="caption" tone="secondary">
              {t('auth.reset.match')}
            </Text>
          </View>
        ) : null}
      </View>
      {formError ? (
        <Text variant="bodySm" tone="invalid" accessibilityRole="alert">
          {formError}
        </Text>
      ) : null}
      <Button label={t(email ? 'auth.reset.saveAndLogIn' : 'auth.reset.save')} onPress={save} loading={saving} />
      <View className="mt-auto items-center pt-2">
        <LinkPrompt prompt={t('auth.reset.remembered')} action={t('auth.reset.backToLogin')} onPress={() => router.replace('/login')} />
      </View>
    </FormScreen>
  );
}
