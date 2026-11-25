import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useNotificationFormatter } from '@/features/notifications/formatNotification';
import type { AppNotification } from '@/features/notifications/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme } from '@/theme';

type NotificationCardProps = {
  notification: AppNotification;
  now: number;
  onPress: () => void;
};

export function NotificationCard({ notification, now, onPress }: NotificationCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useNotificationFormatter();
  const { title, body } = format.content(notification);
  const look = format.look(notification);
  const unread = !notification.readAt;
  const when = format.when(notification.createdAt, now);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={[unread ? t('notifications.unread') : null, title, body, when].filter(Boolean).join('. ')}
      onPress={onPress}
      className="flex-row gap-3.5 rounded-card border border-border bg-surface p-4 active:opacity-80"
    >
      <View
        className="h-10 w-10 items-center justify-center rounded-xl"
        style={{ backgroundColor: unread ? look.tile : colors.background }}
      >
        <Ionicons name={look.icon} size={20} color={unread ? look.iconColor : colors.foregroundMuted} />
      </View>
      <View className="flex-1 gap-1 pr-3">
        <Text variant="subheading">{title}</Text>
        {body ? (
          <Text variant="caption" tone="secondary">
            {body}
          </Text>
        ) : null}
        <Text variant="captionSm" tone="muted" className="mt-0.5">
          {when}
        </Text>
      </View>
      {unread ? <View className="absolute right-4 top-4 h-2 w-2 rounded-full bg-accent" /> : null}
    </PressableScale>
  );
}
