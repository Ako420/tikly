import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { sampleUser } from '@/features/events/sampleEvents';
import { useTranslation } from '@/i18n/I18nProvider';

export default function Profile() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const name = user?.name ?? sampleUser.name;
  const contact = user?.email ?? user?.phone ?? `${sampleUser.city}, ${sampleUser.country}`;

  const handleSignOut = async () => {
    setSigningOut(true);
    await signOut();
    router.replace('/login');
  };

  return (
    <Screen edges={['top']}>
      <View className="h-14 justify-center px-6">
        <Text variant="headline" accessibilityRole="header">
          {t('profile.title')}
        </Text>
      </View>
      <View className="flex-1 gap-6 px-6 pt-4">
        <View className="flex-row items-center gap-3.5 rounded-card border border-border bg-surface-raised p-3.5">
          <Avatar name={name} />
          <View className="flex-1 gap-0.5">
            <Text variant="subheading">{name}</Text>
            <Text variant="caption" tone="muted">
              {contact}
            </Text>
          </View>
        </View>
        <View className="flex-row items-center justify-between rounded-card border border-border bg-surface-raised p-3.5">
          <Text variant="bodySmStrong">{t('common.language')}</Text>
          <LanguageToggle />
        </View>
        <Button label={t('profile.signOut')} variant="outline" onPress={handleSignOut}
          loading={signingOut} className="mt-auto mb-6" />
      </View>
    </Screen>
  );
}
