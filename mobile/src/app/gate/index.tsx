import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { Logo } from '@/components/brand/Logo';
import { LiveGateCard } from '@/components/gate/LiveGateCard';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { useGateFormatter } from '@/features/gate/formatGate';
import { useGateEvents, useGateStaff } from '@/features/gate/gateStore';
import { sampleStaff } from '@/features/gate/sampleGate';
import { isGateLive, type GateEvent } from '@/features/gate/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme';

export default function GateEvents() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const staff = useGateStaff();
  const format = useGateFormatter();
  const errorMessage = useApiErrorMessage();
  const { events, loading, error, reload } = useGateEvents();
  const now = useNow();
  const live = events.filter((event) => isGateLive(event, now));
  const upcoming = events.filter((event) => !isGateLive(event, now) && new Date(event.endAt).getTime() > now);
  const organizer = events[0]?.organizerName || (user ? '' : sampleStaff.organizerName);

  const startScanning = (event: GateEvent) => router.push({ pathname: '/gate/[eventId]', params: { eventId: event.id } });

  const showOpensAt = (event: GateEvent) =>
    Alert.alert(format.title(event.title), t('gate.events.lockedBody', { when: format.upcomingMeta(event) }));

  const logOut = async () => {
    if (user) await signOut();
    router.replace(user ? '/login' : '/onboarding');
  };

  return (
    <Screen>
      <View className="h-16 flex-row items-center justify-between px-6">
        <View className="flex-row items-center gap-2">
          <Logo />
          <View className="rounded-full bg-primary px-2 py-0.5">
            <Text variant="tagStrong" tone="onPrimary">
              {t('gate.tag')}
            </Text>
          </View>
        </View>
        <Avatar name={staff.name} />
      </View>

      <ScrollView contentContainerClassName="grow gap-[18px] px-6 pb-[30px] pt-3" showsVerticalScrollIndicator={false}>
        <View className="gap-2">
          <Text variant="eyebrow" tone="accent">
            {t('gate.events.eyebrow', { name: staff.name })}
          </Text>
          <Text variant="headline" accessibilityRole="header">
            {t('gate.events.title')}
          </Text>
          {organizer ? (
            <Text tone="secondary">
              {t('gate.events.assignedBy', { organizer })}
            </Text>
          ) : null}
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color={colors.accentText} size="large" />
          </View>
        ) : error ? (
          <EmptyState
            icon="cloud-offline-outline"
            title={t('gate.events.loadFailed')}
            body={errorMessage(error)}
            actionLabel={t('common.retry')}
            onAction={reload}
          />
        ) : events.length === 0 ? (
          <EmptyState icon="calendar-outline" title={t('gate.events.emptyTitle')} body={t('gate.events.emptyBody')} />
        ) : (
          <>
            {live.map((event) => (
              <LiveGateCard key={event.id} event={event} onStart={() => startScanning(event)} />
            ))}
            {upcoming.length > 0 ? (
              <View className="gap-2.5">
                <Text variant="eyebrow" tone="muted">
                  {t('gate.events.comingUp')}
                </Text>
                {upcoming.map((event) => (
                  <Pressable
                    key={event.id}
                    accessibilityRole="button"
                    accessibilityHint={t('gate.events.lockedHint')}
                    onPress={() => showOpensAt(event)}
                    className="flex-row items-center gap-3.5 rounded-2xl border border-border bg-surface p-3.5"
                  >
                    <View className="h-10 w-10 items-center justify-center rounded-xl bg-background">
                      <Ionicons name="lock-closed" size={18} color={colors.foregroundMuted} />
                    </View>
                    <View className="flex-1 gap-0.5">
                      <Text variant="subheading" numberOfLines={1}>
                        {format.title(event.title)}
                      </Text>
                      <Text variant="caption" tone="muted" numberOfLines={1}>
                        {format.upcomingMeta(event)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={colors.foregroundMuted} />
                  </Pressable>
                ))}
              </View>
            ) : null}
          </>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={logOut}
          hitSlop={8}
          className="mt-auto flex-row items-center justify-center gap-2 py-3"
        >
          <Ionicons name="log-out-outline" size={18} color={colors.accentText} />
          <Text variant="subtitle" tone="accent">
            {t('gate.events.logout')}
          </Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}
