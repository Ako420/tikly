import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { EditProfileSheet } from '@/components/profile/EditProfileSheet';
import { SettingsGroup, SettingsRow } from '@/components/profile/SettingsGroup';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/IconButton';
import { LanguageToggle } from '@/components/ui/LanguageToggle';
import { OptionSheet } from '@/components/ui/OptionSheet';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { env } from '@/config/env';
import type { UserRole } from '@/features/auth/api';
import { useAuth } from '@/features/auth/AuthProvider';
import { isSignUpRole } from '@/features/auth/roles';
import { HOME_CITIES, setHomeCity, useHomeCity } from '@/features/preferences/homeCity';
import { useTranslation } from '@/i18n/I18nProvider';
import { toLocalCameroonNumber } from '@/lib/validation';
import { useTabBarSpace } from '@/components/navigation/TabBar';
import { useTheme } from '@/theme';

const formatPhone = (phone: string) =>
  toLocalCameroonNumber(phone).replace(/^(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5');

export default function Profile() {
  const tabBarSpace = useTabBarSpace();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, signOut, setUser } = useAuth();
  const city = useHomeCity();
  const [cityOpen, setCityOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const name = user?.name ?? t('profile.guest');
  const role: UserRole = user?.role ?? 'attendee';
  const roleLabel = isSignUpRole(role) ? t(`auth.roles.${role}.title`) : t(`profile.roles.${role}`);

  const requireSignIn = (action: () => void) => () => (user ? action() : router.push('/login'));

  const changePassword = () =>
    router.push({ pathname: '/forgot-password', params: user?.email ? { email: user.email } : {} });

  const logOut = async () => {
    if (user) await signOut();
    router.replace(user ? '/login' : '/onboarding');
  };

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerClassName="gap-[18px] px-6 pb-8" contentContainerStyle={{ paddingBottom: tabBarSpace }} showsVerticalScrollIndicator={false}>
        <View className="h-14 justify-center">
          <Text variant="headline" accessibilityRole="header">
            {t('profile.title')}
          </Text>
        </View>

        <View className="flex-row items-center gap-3.5 rounded-card border border-border bg-surface p-4">
          <Avatar name={name} size="lg" />
          <View className="flex-1 gap-1">
            <Text variant="title" numberOfLines={1}>
              {name}
            </Text>
            {user?.email ? (
              <Text variant="caption" tone="muted" numberOfLines={1}>
                {user.email}
              </Text>
            ) : null}
            <View className="self-start rounded-full bg-accent px-2 py-0.5">
              <Text variant="tagStrong" tone="onAccent">
                {roleLabel}
              </Text>
            </View>
          </View>
          <IconButton
            icon={<Ionicons name="create-outline" size={20} color={colors.accentText} />}
            accessibilityLabel={t('profile.edit.title')}
            onPress={requireSignIn(() => setEditOpen(true))}
          />
        </View>

        <SettingsGroup title={t('profile.preferences')}>
          <SettingsRow icon="language" label={t('common.language')} trailing={<LanguageToggle />} />
          <SettingsRow icon="location" label={t('profile.homeCity')} value={city} onPress={() => setCityOpen(true)} />
          <SettingsRow
            icon="notifications-outline"
            label={t('profile.notifications')}
            value={t('profile.notificationChannels')}
            onPress={() => router.push('/notifications')}
          />
        </SettingsGroup>

        <SettingsGroup title={t('profile.account')}>
          <SettingsRow
            icon="phone-portrait-outline"
            label={t('profile.phone')}
            value={user ? formatPhone(user.phone) : undefined}
            onPress={requireSignIn(() => setEditOpen(true))}
            showChevron={!user}
          />
          <SettingsRow icon="lock-closed" label={t('profile.changePassword')} onPress={requireSignIn(changePassword)} />
          <SettingsRow icon="help-circle" label={t('profile.help')} onPress={() => Linking.openURL(`${env.webUrl}/help`)} />
          <SettingsRow icon="document-text" label={t('profile.terms')} onPress={() => Linking.openURL(`${env.webUrl}/terms`)} />
        </SettingsGroup>

        <Pressable accessibilityRole="button" onPress={logOut} hitSlop={8} className="flex-row items-center justify-center gap-2 py-1.5">
          <Ionicons name="log-out-outline" size={18} color={colors.invalid} />
          <Text variant="subtitle" tone="invalid">
            {user ? t('profile.logOut') : t('profile.logIn')}
          </Text>
        </Pressable>
      </ScrollView>

      <OptionSheet
        visible={cityOpen}
        title={t('profile.homeCity')}
        options={HOME_CITIES.map((value) => ({ value, label: value }))}
        value={city as (typeof HOME_CITIES)[number]}
        onSelect={setHomeCity}
        onClose={() => setCityOpen(false)}
      />
      {user ? <EditProfileSheet key={user.id} user={user} visible={editOpen} onClose={() => setEditOpen(false)} onSaved={setUser} /> : null}
    </Screen>
  );
}
