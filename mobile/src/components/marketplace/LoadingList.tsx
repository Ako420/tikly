import type { ComponentProps } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import type Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage, type ApiError } from '@/lib/api';
import { useTheme } from '@/theme';

type Props = {
  loading: boolean;
  error?: ApiError;
  onRetry: () => void;
  icon: ComponentProps<typeof Ionicons>['name'];
  emptyTitle: string;
  emptyBody: string;
};

export function ListFallback({ loading, error, onRetry, icon, emptyTitle, emptyBody }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const errorMessage = useApiErrorMessage();

  if (loading) {
    return (
      <View className="items-center py-16">
        <ActivityIndicator color={colors.accentText} size="large" />
      </View>
    );
  }
  if (error) {
    return <EmptyState icon="cloud-offline-outline" title={t('marketplace.loadFailed')} body={errorMessage(error)} actionLabel={t('marketplace.retry')} onAction={onRetry} />;
  }
  return <EmptyState icon={icon} title={emptyTitle} body={emptyBody} />;
}
