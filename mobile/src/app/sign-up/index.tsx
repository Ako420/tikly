import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { RoleCard } from '@/components/auth/RoleCard';
import { Button } from '@/components/ui/Button';
import { FormScreen } from '@/components/ui/FormScreen';
import { LinkPrompt } from '@/components/ui/LinkPrompt';
import { ScreenHeading } from '@/components/ui/ScreenHeading';
import { roleMeta, SIGN_UP_ROLES, type SignUpRole } from '@/features/auth/roles';
import { useRedirectIfSignedIn } from '@/features/auth/useRedirectIfSignedIn';
import { useTranslation } from '@/i18n/I18nProvider';

export default function ChooseRole() {
  useRedirectIfSignedIn();
  const { t } = useTranslation();
  const [role, setRole] = useState<SignUpRole>('attendee');

  return (
    <FormScreen contentClassName="gap-5 pt-2">
      <ScreenHeading
        eyebrow={t('auth.signUp.stepRole')}
        title={t('auth.signUp.roleTitle')}
        subtitle={t('auth.signUp.roleBody')}
      />
      <View accessibilityRole="radiogroup" className="gap-3">
        {SIGN_UP_ROLES.map((option) => (
          <RoleCard
            key={option}
            icon={roleMeta[option].icon}
            title={t(`auth.roles.${option}.title`)}
            description={t(`auth.roles.${option}.description`)}
            tag={roleMeta[option].hasTag ? t(`auth.roles.${option}.tag`) : undefined}
            selected={role === option}
            onPress={() => setRole(option)}
          />
        ))}
      </View>
      <View className="mt-auto items-center gap-4 pt-2">
        <Button
          label={t('auth.signUp.continueAs', { role: t(`auth.roles.${role}.title`) })}
          onPress={() => router.push({ pathname: '/sign-up/details', params: { role } })}
        />
        <LinkPrompt prompt={t('auth.signUp.haveAccount')} action={t('auth.logIn')} onPress={() => router.replace('/login')} />
      </View>
    </FormScreen>
  );
}
