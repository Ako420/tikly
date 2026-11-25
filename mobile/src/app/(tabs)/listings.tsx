import { router } from 'expo-router';
import { FlatList, RefreshControl } from 'react-native';
import { ListFallback } from '@/components/marketplace/LoadingList';
import { ScreenTitle } from '@/components/marketplace/ScreenTitle';
import { ServiceCard } from '@/components/marketplace/ServiceCard';
import { Screen } from '@/components/ui/Screen';
import { marketplaceApi } from '@/features/marketplace/api';
import { useTranslation } from '@/i18n/I18nProvider';
import { useAsync } from '@/lib/useAsync';
import { useTabBarSpace } from '@/components/navigation/TabBar';
import { EnterCell } from '@/components/motion/EnterCell';
import { useTheme } from '@/theme';

export default function Listings() {
  const tabBarSpace = useTabBarSpace();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const services = useAsync(() => marketplaceApi.myServices(), 'my-services');
  const items = (services.data ?? []).map((service) => ({ ...service, provider: null }));

  return (
    <Screen edges={['top']}>
      <FlatList
        CellRendererComponent={EnterCell}
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ScreenTitle eyebrow={t('provider.listings.eyebrow')} title={t('provider.listings.title')} />}
        contentContainerClassName="gap-3 px-6 pb-8 pt-3" contentContainerStyle={{ paddingBottom: tabBarSpace }}
        refreshControl={<RefreshControl refreshing={services.loading && items.length > 0} onRefresh={services.reload} tintColor={colors.accentText} />}
        renderItem={({ item }) => <ServiceCard service={item} onPress={() => router.push({ pathname: '/services/[id]', params: { id: item.id } })} />}
        ListEmptyComponent={
          <ListFallback
            loading={services.loading}
            error={services.error}
            onRetry={services.reload}
            icon="grid-outline"
            emptyTitle={t('provider.listings.emptyTitle')}
            emptyBody={t('provider.listings.emptyBody')}
          />
        }
      />
    </Screen>
  );
}
