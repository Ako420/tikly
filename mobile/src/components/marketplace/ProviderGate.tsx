import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import type { MyProvider } from '@/features/marketplace/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage, type ApiError } from '@/lib/api';
import { useTheme } from '@/theme';

type ProviderGateProps = {
  provider?: MyProvider;
  loading: boolean;
  error?: ApiError;
  onRetry: () => void;
  children: (provider: MyProvider) => ReactNode;
};

export function ProviderGate({ provider, loading, error, onRetry, children }: ProviderGateProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const errorMessage = useApiErrorMessage();

  if (provider) return <>{children(provider)}</>;
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator color={colors.accentText} size="large" />
      </View>
    );
  }
  if (error?.status === 404) {
    return (
      <View className="flex-1 justify-center">
        <EmptyState icon="briefcase-outline" title={t('provider.setup.title')} body={t('provider.setup.body')} />
      </View>
    );
  }
  return (
    <View className="flex-1 justify-center">
      <EmptyState
        icon="cloud-offline-outline"
        title={t('marketplace.loadFailed')}
        body={error ? errorMessage(error) : ''}
        actionLabel={t('marketplace.retry')}
        onAction={onRetry}
      />
    </View>
  );
}
