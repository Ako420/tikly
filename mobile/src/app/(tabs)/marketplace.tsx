import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, View } from 'react-native';
import { CategoryGrid } from '@/components/marketplace/CategoryGrid';
import { ListFallback } from '@/components/marketplace/LoadingList';
import { ScreenTitle } from '@/components/marketplace/ScreenTitle';
import { ServiceCard } from '@/components/marketplace/ServiceCard';
import { Chip } from '@/components/ui/Chip';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { marketplaceApi } from '@/features/marketplace/api';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import type { ServiceCategory } from '@/features/marketplace/types';
import { HOME_CITIES, useHomeCity } from '@/features/preferences/homeCity';
import { useTranslation } from '@/i18n/I18nProvider';
import { formatMoney } from '@/lib/money';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme';

const PRICE_CAPS = [100_000, 500_000];
const SEARCH_DEBOUNCE_MS = 350;

export default function Marketplace() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useMarketplaceFormat();
  const homeCity = useHomeCity();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ServiceCategory>();
  const [city, setCity] = useState<string | undefined>(homeCity);
  const [maxPrice, setMaxPrice] = useState<number>();

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const key = JSON.stringify({ search, category, city, maxPrice });
  const services = useAsync(
    () => marketplaceApi.services({ q: search || undefined, category, city, maxPrice, limit: 50 }),
    key,
  );
  const items = services.data?.items ?? [];
  const total = services.data?.total ?? 0;
  const nextCity = () => {
    const index = city ? HOME_CITIES.indexOf(city as (typeof HOME_CITIES)[number]) : -1;
    setCity(index + 1 < HOME_CITIES.length ? HOME_CITIES[index + 1] : undefined);
  };
  const nextPrice = () => {
    const index = maxPrice ? PRICE_CAPS.indexOf(maxPrice) : -1;
    setMaxPrice(index + 1 < PRICE_CAPS.length ? PRICE_CAPS[index + 1] : undefined);
  };

  const header = (
    <View className="gap-[18px] pb-3">
      <ScreenTitle eyebrow={t('marketplace.eyebrow')} title={t('marketplace.title')} />
      <SearchField placeholder={t('marketplace.searchPlaceholder')} value={query} onChangeText={setQuery} returnKeyType="search" />
      <CategoryGrid selected={category} onSelect={setCategory} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-6" contentContainerClassName="gap-2 px-6">
        <Chip label={city ?? t('marketplace.anyCity')} selected={Boolean(city)} icon="map-marker" trailing="expand" onPress={nextCity} />
        <Chip
          label={maxPrice ? t('marketplace.under', { price: formatMoney(maxPrice) }) : t('marketplace.anyPrice')}
          selected={Boolean(maxPrice)}
          trailing="expand"
          onPress={nextPrice}
        />
      </ScrollView>
      {services.data ? (
        <Text variant="captionStrong" tone="secondary">
          {category
            ? t('marketplace.resultsIn', { count: total, category: format.category(category), city: city ?? t('marketplace.allCities') })
            : t('marketplace.results', { count: total })}
        </Text>
      ) : null}
    </View>
  );

  return (
    <Screen edges={['top']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerClassName="gap-3 px-6 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={services.loading && items.length > 0} onRefresh={services.reload} tintColor={colors.accentText} />}
        renderItem={({ item }) => (
          <ServiceCard service={item} onPress={() => router.push({ pathname: '/services/[id]', params: { id: item.id } })} />
        )}
        ListEmptyComponent={
          <ListFallback
            loading={services.loading}
            error={services.error}
            onRetry={services.reload}
            icon="storefront-outline"
            emptyTitle={t('marketplace.emptyTitle')}
            emptyBody={t('marketplace.emptyBody')}
          />
        }
      />
    </Screen>
  );
}
