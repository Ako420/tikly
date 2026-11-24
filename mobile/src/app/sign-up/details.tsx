import AntDesign from '@expo/vector-icons/AntDesign';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Divider } from '@/components/ui/Divider';
import { FormScreen } from '@/components/ui/FormScreen';
import { LinkPrompt } from '@/components/ui/LinkPrompt';
import { PhonePrefix } from '@/components/ui/PhonePrefix';
import { ScreenHeading } from '@/components/ui/ScreenHeading';
import { Text } from '@/components/ui/Text';
import { TextField, type TextFieldHandle } from '@/components/ui/TextField';
import { homeRouteFor } from '@/features/auth/homeRoute';
import { useAuth } from '@/features/auth/AuthProvider';
import { isSignUpRole } from '@/features/auth/roles';
import { useTranslation } from '@/i18n/I18nProvider';
import { toApiError, useApiErrorMessage } from '@/lib/api';
import { isCameroonMobile, isEmail, MIN_PASSWORD_LENGTH, toInternationalCameroonNumber } from '@/lib/validation';
import { useTheme } from '@/theme';

type Field = 'name' | 'email' | 'phone' | 'password' | 'terms';

export default function SignUpDetails() {
  const { t, language } = useTranslation();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ role?: string }>();
  const role = isSignUpRole(params.role) ? params.role : 'attendee';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [formError, setFormError] = useState<string>();
  const { signUp } = useAuth();
  const errorMessage = useApiErrorMessage();

  const emailRef = useRef<TextFieldHandle>(null);
  const phoneRef = useRef<TextFieldHandle>(null);
  const passwordRef = useRef<TextFieldHandle>(null);

  const errors = useMemo(() => {
    const next: Partial<Record<Field, string>> = {};
    if (!name.trim()) next.name = t('auth.errors.nameRequired');
    if (!isEmail(email)) next.email = t('auth.errors.emailInvalid');
    if (!isCameroonMobile(phone)) next.phone = t('auth.errors.phoneInvalid');
    if (password.length < MIN_PASSWORD_LENGTH) next.password = t('auth.errors.passwordShort', { min: MIN_PASSWORD_LENGTH });
    if (!acceptedTerms) next.terms = t('auth.errors.termsRequired');
    return next;
  }, [name, email, phone, password, acceptedTerms, t]);

  const visibleError = (field: Field) => serverErrors[field] ?? (submitted ? errors[field] : undefined);

  const clearServerError = (field: Field) =>
    setServerErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));

  const handleSubmit = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0 || submitting) return;
    setServerErrors({});
    setFormError(undefined);
    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        phone: toInternationalCameroonNumber(phone),
        password,
        role,
        language,
      });
      router.replace(homeRouteFor({ role }));
    } catch (error) {
      const apiError = toApiError(error);
      const fields: Partial<Record<Field, string>> = {};
      for (const [path, message] of Object.entries(apiError.fieldErrors)) {
        if (path === 'name' || path === 'email' || path === 'phone' || path === 'password') fields[path] = message;
      }
      if (apiError.code === 'EMAIL_TAKEN') fields.email = apiError.message;
      if (apiError.code === 'PHONE_TAKEN') fields.phone = apiError.message;
      setServerErrors(fields);
      if (Object.keys(fields).length === 0) setFormError(errorMessage(apiError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormScreen contentClassName="gap-4 pt-1">
      <ScreenHeading
        eyebrow={t('auth.signUp.stepDetails', { role: t(`auth.roles.${role}.title`) })}
        title={t('auth.signUp.detailsTitle')}
      />
      <View className="gap-3.5">
        <Button
          variant="outline"
          label={t('auth.continueWithGoogle')}
          icon={<AntDesign name="google" size={20} color={colors.foreground} />}
        />
        <Divider label={t('auth.signUp.orEmail')} />
      </View>
      <View className="gap-3">
        <TextField
          label={t('auth.fields.fullName')}
          value={name}
          onChangeText={(value) => {
            setName(value);
            clearServerError('name');
          }}
          error={visibleError('name')}
          autoCapitalize="words"
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          ref={emailRef}
          label={t('auth.fields.email')}
          value={email}
          onChangeText={(value) => {
            setEmail(value);
            clearServerError('email');
          }}
          error={visibleError('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          ref={phoneRef}
          label={t('auth.fields.phone')}
          value={phone}
          onChangeText={(value) => {
            setPhone(value.replace(/[^\d\s]/g, ''));
            clearServerError('phone');
          }}
          hint={t('auth.signUp.phoneHint')}
          error={visibleError('phone')}
          prefix={<PhonePrefix />}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          maxLength={12}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
          submitBehavior="submit"
        />
        <TextField
          ref={passwordRef}
          label={t('auth.fields.password')}
          value={password}
          onChangeText={(value) => {
            setPassword(value);
            clearServerError('password');
          }}
          placeholder={t('auth.signUp.passwordPlaceholder', { min: MIN_PASSWORD_LENGTH })}
          error={visibleError('password')}
          secure
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
        />
      </View>
      <View className="gap-1.5">
        <Checkbox
          checked={acceptedTerms}
          onChange={setAcceptedTerms}
          invalid={!!visibleError('terms')}
          accessibilityLabel={`${t('auth.signUp.termsPrefix')}${t('auth.signUp.terms')}${t('auth.signUp.termsJoin')}${t('auth.signUp.privacy')}`}
          label={
            <Text variant="bodySm" tone="secondary">
              {t('auth.signUp.termsPrefix')}
              <Text variant="link" tone="accent" accessibilityRole="link">
                {t('auth.signUp.terms')}
              </Text>
              {t('auth.signUp.termsJoin')}
              <Text variant="link" tone="accent" accessibilityRole="link">
                {t('auth.signUp.privacy')}
              </Text>
            </Text>
          }
        />
        {visibleError('terms') ? (
          <Text variant="caption" tone="invalid">
            {visibleError('terms')}
          </Text>
        ) : null}
      </View>
      <View className="mt-auto items-center gap-4 pt-2">
        {formError ? (
          <Text variant="bodySm" tone="invalid" accessibilityRole="alert" className="self-stretch">
            {formError}
          </Text>
        ) : null}
        <Button label={t('auth.signUp.createAccount')} onPress={handleSubmit} loading={submitting} />
        <LinkPrompt prompt={t('auth.signUp.haveAccount')} action={t('auth.logIn')} onPress={() => router.replace('/login')} />
      </View>
    </FormScreen>
  );
}
