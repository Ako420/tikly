import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Divider } from '@/components/ui/Divider';
import { GoogleLogo } from '@/components/ui/GoogleLogo';
import { FormScreen } from '@/components/ui/FormScreen';
import { LinkPrompt } from '@/components/ui/LinkPrompt';
import { PillButton } from '@/components/ui/PillButton';
import { ScreenHeading } from '@/components/ui/ScreenHeading';
import { Text } from '@/components/ui/Text';
import { TextField, type TextFieldHandle } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { GoogleSignInCancelled } from '@/features/auth/google';
import { homeRouteFor } from '@/features/auth/homeRoute';
import { useTranslation } from '@/i18n/I18nProvider';
import { toApiError, useApiErrorMessage } from '@/lib/api';
import { isCameroonMobile, isEmail, toInternationalCameroonNumber } from '@/lib/validation';
import { useRedirectIfSignedIn } from '@/features/auth/useRedirectIfSignedIn';
import { useTheme } from '@/theme';

type Field = 'identifier' | 'password';

export default function Login() {
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string>();
  const passwordRef = useRef<TextFieldHandle>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  useRedirectIfSignedIn();
  const errorMessage = useApiErrorMessage();

  const errors = useMemo(() => {
    const next: Partial<Record<Field, string>> = {};
    if (!isEmail(identifier) && !isCameroonMobile(identifier)) next.identifier = t('auth.errors.identifierInvalid');
    if (!password) next.password = t('auth.errors.passwordRequired');
    return next;
  }, [identifier, password, t]);

  const visibleError = (field: Field) => (submitted ? errors[field] : undefined);

  const handleSubmit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || submitting) return;
    setFormError(undefined);
    setSubmitting(true);
    try {
      const value = identifier.trim();
      const user = await signIn({ identifier: isEmail(value) ? value : toInternationalCameroonNumber(value), password });
      router.replace(homeRouteFor(user));
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (googleLoading) return;
    setFormError(undefined);
    setGoogleLoading(true);
    try {
      const user = await signInWithGoogle({ language });
      router.replace(homeRouteFor(user));
    } catch (error) {
      if (error instanceof GoogleSignInCancelled) return;
      const apiError = toApiError(error);
      if (apiError.code === 'GOOGLE_SIGNUP_INCOMPLETE') {
        router.push('/sign-up');
        return;
      }
      setFormError(errorMessage(apiError));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <FormScreen contentClassName="gap-[22px] pt-2">
      <ScreenHeading eyebrow={t('auth.login.eyebrow')} title={t('auth.login.title')} subtitle={t('auth.login.body')} />
      <View className="gap-3.5">
        <TextField
          label={t('auth.fields.identifier')}
          value={identifier}
          onChangeText={setIdentifier}
          error={visibleError('identifier')}
          leading={<Ionicons name="mail-outline" size={20} color={colors.foregroundMuted} />}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          ref={passwordRef}
          label={t('auth.fields.password')}
          value={password}
          onChangeText={setPassword}
          error={visibleError('password')}
          secure
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />
        <View className="items-end">
          <Pressable
            accessibilityRole="link"
            hitSlop={8}
            onPress={() =>
              router.push({ pathname: '/forgot-password', params: isEmail(identifier.trim()) ? { email: identifier.trim() } : {} })
            }
          >
            <Text variant="link" tone="accent">
              {t('auth.login.forgot')}
            </Text>
          </Pressable>
        </View>
      </View>
      <View className="gap-5">
        {formError ? (
          <Text variant="bodySm" tone="invalid" accessibilityRole="alert">
            {formError}
          </Text>
        ) : null}
        <Button label={t('auth.logIn')} onPress={handleSubmit} loading={submitting} />
        <Divider label={t('auth.login.or')} />
        <Button
          variant="outline"
          label={t('auth.continueWithGoogle')}
          icon={<GoogleLogo />}
          loading={googleLoading}
          onPress={handleGoogle}
        />
      </View>
      <View className="mt-auto items-center gap-4 pt-2">
        <PillButton
          label={t('auth.login.gateStaff')}
          icon={<MaterialCommunityIcons name="qrcode-scan" size={18} color={colors.accentText} />}
        />
        <LinkPrompt
          prompt={t('auth.login.newHere')}
          action={t('auth.login.createAccount')}
          onPress={() => router.replace('/sign-up')}
        />
      </View>
    </FormScreen>
  );
}
