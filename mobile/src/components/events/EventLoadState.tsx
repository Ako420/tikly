import { router } from 'expo-router';
import { View } from 'react-native';
import { EventDetailsSkeleton, EventListSkeleton } from '@/components/events/EventSkeletons';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import type { Resource } from '@/features/events/useEvents';
import { useTranslation } from '@/i18n/I18nProvider';
import { toApiError, useApiErrorMessage } from '@/lib/api';

type EventLoadStateProps = {
  resource: Resource<unknown>;
  icon: 'calendar-outline' | 'ticket-outline';
};

export function EventLoadState({ resource, icon }: EventLoadStateProps) {
  const { t } = useTranslation();
  const errorMessage = useApiErrorMessage();
  const notFound = !resource.error || toApiError(resource.error).status === 404;

  if (resource.loading) {
    return (
      <Screen edges={icon === 'calendar-outline' ? [] : ['top']}>
        {icon === 'calendar-outline' ? (
          <EventDetailsSkeleton />
        ) : (
          <View className="gap-4 px-6 pt-16">
            <EventListSkeleton count={3} variant="result" />
          </View>
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="flex-1 justify-center">
        {notFound ? (
          <EmptyState
            icon={icon}
            title={t('eventDetails.notFoundTitle')}
            body={t('eventDetails.notFoundBody')}
            actionLabel={t('common.back')}
            onAction={() => router.back()}
          />
        ) : (
          <EmptyState
            icon="cloud-offline-outline"
            title={t('errors.generic')}
            body={errorMessage(resource.error)}
            actionLabel={t('errors.retry')}
            onAction={resource.refetch}
          />
        )}
      </View>
    </Screen>
  );
}
