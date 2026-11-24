import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, SectionList, View } from 'react-native';
import { NotificationCard } from '@/components/notifications/NotificationCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { isToday, useNotificationFormatter } from '@/features/notifications/formatNotification';
import { notificationStore, useNotifications } from '@/features/notifications/notificationStore';
import type { AppNotification } from '@/features/notifications/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { useNow } from '@/lib/useNow';
import { useTheme } from '@/theme';

export default function Notifications() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const now = useNow();
  const format = useNotificationFormatter();
  const errorMessage = useApiErrorMessage();
  const { items, unreadCount, loading, error, reload } = useNotifications();

  const today = items.filter((item) => isToday(item.createdAt, now));
  const earlier = items.filter((item) => !isToday(item.createdAt, now));
  const sections = [
    { key: 'today', title: t('notifications.today'), data: today },
    { key: 'earlier', title: t('notifications.earlier'), data: earlier },
  ].filter((section) => section.data.length > 0);

  const open = (notification: AppNotification) => {
    notificationStore.markRead([notification.id]);
    const target = format.target(notification);
    if (target) router.push(target);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <Screen>
      <View className="h-[52px] flex-row items-center justify-between px-6">
        <IconButton
          icon={<Ionicons name="chevron-back" size={20} color={colors.foreground} />}
          accessibilityLabel={t('common.back')}
          onPress={goBack}
        />
        {unreadCount > 0 ? (
          <Pressable accessibilityRole="button" onPress={notificationStore.markAllRead} hitSlop={8}>
            <Text variant="link" tone="accent">
              {t('notifications.markAllRead')}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        contentContainerClassName="grow px-6 pb-8"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View className="flex-row items-center justify-between pb-2 pt-3">
            <Text variant="headline" accessibilityRole="header">
              {t('notifications.title')}
            </Text>
            {unreadCount > 0 ? (
              <View className="rounded-full bg-accent px-2.5 py-1">
                <Text variant="tagStrong" tone="onAccent">
                  {t('notifications.newCount', { count: unreadCount })}
                </Text>
              </View>
            ) : null}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <Text variant="eyebrow" tone="muted" className="pb-2.5 pt-5">
            {section.title}
          </Text>
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => <NotificationCard notification={item} now={now} onPress={() => open(item)} />}
        ListEmptyComponent={
          <View className="flex-1 justify-center py-16">
            {loading ? (
              <ActivityIndicator color={colors.accentText} size="large" />
            ) : error ? (
              <EmptyState
                icon="cloud-offline-outline"
                title={t('notifications.loadFailed')}
                body={errorMessage(error)}
                actionLabel={t('common.retry')}
                onAction={reload}
              />
            ) : (
              <EmptyState icon="notifications-outline" title={t('notifications.emptyTitle')} body={t('notifications.emptyBody')} />
            )}
          </View>
        }
      />
    </Screen>
  );
}
