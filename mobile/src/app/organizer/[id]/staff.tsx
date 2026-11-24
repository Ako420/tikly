import Ionicons from '@expo/vector-icons/Ionicons';
import * as Crypto from 'expo-crypto';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Linking, Pressable, View } from 'react-native';
import { StatusPill } from '@/components/marketplace/StatusPill';
import { FieldBox } from '@/components/organizer/FieldBox';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import { organizerApi, type StaffMember } from '@/features/organizer/api';
import { useTranslation } from '@/i18n/I18nProvider';
import { toApiError, useApiErrorMessage } from '@/lib/api';
import { useAsync } from '@/lib/useAsync';
import { isCameroonMobile, toInternationalCameroonNumber, toLocalCameroonNumber } from '@/lib/validation';
import { useTheme } from '@/theme';

const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
const PASSWORD_LENGTH = 10;

const newPassword = () => {
  const bytes = Crypto.getRandomBytes(PASSWORD_LENGTH);
  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join('');
};

const formatPhone = (phone: string) => toLocalCameroonNumber(phone).replace(/^(\d)(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5');

export default function GateStaff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useMarketplaceFormat();
  const errorMessage = useApiErrorMessage();
  const event = useAsync(() => organizerApi.event(id), `event-${id}`).data;
  const staff = useAsync(() => organizerApi.staff(), 'organizer-staff');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const all = staff.data ?? [];
  const assigned = all.filter((member) => member.events.some((item) => item.id === id));
  const others = all.filter((member) => member.status === 'active' && !assigned.includes(member));
  const eventTitle = event ? format.text(event.title) : '';
  const nameError = submitted && name.trim().length < 2;
  const phoneError = submitted && !isCameroonMobile(phone);

  const sendLogin = (member: { name: string; phone: string }, password: string) =>
    Linking.openURL(
      `https://wa.me/${toInternationalCameroonNumber(member.phone).replace(/\D/g, '')}?text=${encodeURIComponent(
        t('organizer.staff.loginMessage', { name: member.name, event: eventTitle, phone: formatPhone(member.phone), password }),
      )}`,
    ).catch(() => Alert.alert(t('organizer.staff.loginTitle'), t('organizer.staff.loginFallback', { phone: formatPhone(member.phone), password })));

  const create = async () => {
    setSubmitted(true);
    if (name.trim().length < 2 || !isCameroonMobile(phone)) return;
    setSaving(true);
    setError(undefined);
    const password = newPassword();
    try {
      const member = await organizerApi.createStaff({ name: name.trim(), phone: toInternationalCameroonNumber(phone), password });
      await organizerApi.assignStaff(id, member.id);
      setName('');
      setPhone('');
      setSubmitted(false);
      staff.reload();
      sendLogin(member, password);
    } catch (caught) {
      const apiError = toApiError(caught);
      setError(Object.values(apiError.fieldErrors)[0] ?? errorMessage(caught));
    } finally {
      setSaving(false);
    }
  };

  const assign = async (member: StaffMember) => {
    try {
      await organizerApi.assignStaff(id, member.id);
      staff.reload();
    } catch (caught) {
      Alert.alert(errorMessage(caught));
    }
  };

  const unassign = (member: StaffMember) =>
    Alert.alert(t('organizer.staff.removeTitle', { name: member.name }), eventTitle, [
      { text: t('organizer.staff.keep'), style: 'cancel' },
      {
        text: t('organizer.staff.remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await organizerApi.unassignStaff(id, member.id);
            staff.reload();
          } catch (caught) {
            Alert.alert(errorMessage(caught));
          }
        },
      },
    ]);

  const row = (member: StaffMember, action: 'remove' | 'assign') => (
    <View className="flex-row items-center gap-3 rounded-[18px] border border-border bg-surface-raised p-3.5">
      <Avatar name={member.name} size="md" />
      <View className="flex-1 gap-0.5">
        <Text variant="subheading" numberOfLines={1}>
          {member.name}
        </Text>
        <Text variant="caption" tone="muted">
          {formatPhone(member.phone)}
        </Text>
      </View>
      {action === 'remove' ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t('organizer.staff.remove')} onLongPress={() => unassign(member)} onPress={() => unassign(member)}>
          <StatusPill label={t(`organizer.staff.status.${member.status}`)} tone={member.status === 'active' ? 'valid' : 'warning'} />
        </Pressable>
      ) : (
        <Pressable accessibilityRole="button" onPress={() => assign(member)} hitSlop={8}>
          <Text variant="link" tone="accent">
            {t('organizer.staff.assign')}
          </Text>
        </Pressable>
      )}
    </View>
  );

  const header = (
    <View className="gap-4 pb-1">
      <Text variant="headline" accessibilityRole="header">
        {t('organizer.staff.title')}
      </Text>
      <View className="gap-3 rounded-[22px] border-2 border-accent bg-surface-raised p-4">
        <View className="flex-row items-center gap-2">
          <Ionicons name="person-add" size={18} color={colors.accentText} />
          <Text variant="subheading">{t('organizer.staff.add')}</Text>
        </View>
        <FieldBox value={name} onChangeText={setName} placeholder={t('organizer.staff.name')} maxLength={100} autoComplete="name" error={nameError} />
        <FieldBox
          value={phone}
          onChangeText={(value) => setPhone(value.replace(/[^\d\s+]/g, ''))}
          placeholder={t('organizer.staff.phone')}
          keyboardType="phone-pad"
          maxLength={16}
          error={phoneError}
        />
        {error ? (
          <Text variant="bodySm" tone="invalid" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
        <Button
          label={t('organizer.staff.create')}
          loading={saving}
          icon={<Ionicons name="logo-whatsapp" size={18} color={colors.onAction} />}
          onPress={create}
        />
      </View>
      <Text variant="eyebrow" tone="muted">
        {t('organizer.staff.assignedCount', { count: assigned.length })}
      </Text>
    </View>
  );

  return (
    <Screen edges={['top']}>
      <View className="h-[52px] flex-row items-center gap-3 px-6">
        <IconButton
          accessibilityLabel={t('common.back')}
          onPress={() => router.back()}
          icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
        />
        <Text variant="eyebrow" tone="accent" numberOfLines={1} className="flex-1 text-center">
          {eventTitle}
        </Text>
        <View className="w-10" />
      </View>
      <FlatList
        data={assigned}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerClassName="gap-3 px-6 pb-10 pt-1"
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => row(item, 'remove')}
        ListEmptyComponent={
          staff.loading ? undefined : (
            <Text variant="bodySm" tone="muted">
              {t('organizer.staff.none')}
            </Text>
          )
        }
        ListFooterComponent={
          others.length > 0 ? (
            <View className="gap-3 pt-4">
              <Text variant="eyebrow" tone="muted">
                {t('organizer.staff.yourTeam')}
              </Text>
              {others.map((member) => (
                <View key={member.id}>{row(member, 'assign')}</View>
              ))}
            </View>
          ) : undefined
        }
      />
    </Screen>
  );
}
