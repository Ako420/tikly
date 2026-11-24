import { router } from 'expo-router';
import { View } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n/I18nProvider';

export default function Tickets() {
  const { t } = useTranslation();

  return (
    <Screen edges={['top']}>
      <View className="h-14 justify-center px-6">
        <Text variant="headline" accessibilityRole="header">
          {t('tickets.title')}
        </Text>
      </View>
      <View className="flex-1 justify-center">
        <EmptyState
          icon="ticket-outline"
          title={t('tickets.emptyTitle')}
          body={t('tickets.emptyBody')}
          actionLabel={t('tickets.browse')}
          onAction={() => router.navigate('/explore')}
        />
      </View>
    </Screen>
  );
}
