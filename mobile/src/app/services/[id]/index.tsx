import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, Linking, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORY_ICONS } from '@/components/marketplace/CategoryGrid';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { Screen } from '@/components/ui/Screen';
import { StickyActionBar } from '@/components/ui/StickyActionBar';
import { Text } from '@/components/ui/Text';
import { useAuth } from '@/features/auth/AuthProvider';
import { marketplaceApi } from '@/features/marketplace/api';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import { useTranslation } from '@/i18n/I18nProvider';
import { useApiErrorMessage } from '@/lib/api';
import { formatMoney } from '@/lib/money';
import { shareNative } from '@/lib/share';
import { useAsync } from '@/lib/useAsync';
import { useTheme } from '@/theme';

const HERO_HEIGHT = 240;
const digits = (phone: string) => phone.replace(/\D/g, '');

export default function ServiceDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const format = useMarketplaceFormat();
  const errorMessage = useApiErrorMessage();
  const resource = useAsync(() => marketplaceApi.service(id), id);
  const [photoIndex, setPhotoIndex] = useState(0);
  const service = resource.data;

  if (!service) {
    return (
      <Screen>
        <View className="flex-1 justify-center">
          {resource.loading ? (
            <ActivityIndicator color={colors.accentText} size="large" />
          ) : (
            <EmptyState
              icon="storefront-outline"
              title={t('marketplace.detail.notFound')}
              body={resource.error ? errorMessage(resource.error) : ''}
              actionLabel={t('common.back')}
              onAction={() => router.back()}
            />
          )}
        </View>
      </Screen>
    );
  }

  const { provider } = service;
  const title = format.text(service.title);
  const canRequest = user?.role === 'organizer';
  const whatsapp = provider.whatsapp ?? provider.phone;

  return (
    <View className="flex-1 bg-background">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 + insets.bottom }}>
        <View style={{ height: HERO_HEIGHT }} className="bg-surface">
          {service.photos.length > 0 ? (
            <FlatList
              data={service.photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(uri, index) => `${index}-${uri}`}
              onMomentumScrollEnd={(event) => setPhotoIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
              renderItem={({ item }) => <Image source={{ uri: item }} style={{ width, height: HERO_HEIGHT }} />}
            />
          ) : (
            <View className="flex-1 items-center justify-center">
              <MaterialCommunityIcons name={CATEGORY_ICONS[service.category]} size={64} color={colors.accentText} />
            </View>
          )}
          <View className="absolute left-0 right-0 flex-row justify-between px-6" style={{ top: insets.top + 4 }}>
            <IconButton
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
              icon={<Ionicons name="chevron-back" size={22} color={colors.foreground} />}
            />
            <IconButton
              accessibilityLabel={t('marketplace.detail.share')}
              onPress={() => shareNative(`${title} · ${provider.businessName} · ${formatMoney(service.price)} ${format.unit(service.unit)}`)}
              icon={<Ionicons name="share-outline" size={22} color={colors.foreground} />}
            />
          </View>
          {service.photos.length > 1 ? (
            <View className="absolute bottom-11 right-6 h-7 justify-center rounded-full bg-background px-2.5">
              <Text variant="label">{`${photoIndex + 1} / ${service.photos.length}`}</Text>
            </View>
          ) : null}
        </View>

        <View className="-mt-7 gap-[18px] rounded-t-[28px] bg-background px-6 pt-[22px]">
          <View className="gap-2">
            <View className="flex-row items-center justify-between gap-3">
              <View className="shrink flex-row items-center gap-1">
                <Text variant="eyebrow" tone="accent" numberOfLines={1} className="shrink">
                  {`${format.category(service.category)} · ${provider.businessName}`}
                </Text>
                <MaterialCommunityIcons name="check-decagram" size={16} color={colors.accentText} />
              </View>
              {provider.ratingCount > 0 ? (
                <View className="flex-row items-center gap-1">
                  <Ionicons name="star" size={16} color={colors.accentText} />
                  <Text variant="link">{provider.ratingAvg.toFixed(1)}</Text>
                  <Text variant="bodySm" tone="muted">{`(${provider.ratingCount})`}</Text>
                </View>
              ) : null}
            </View>
            <Text variant="headline" accessibilityRole="header">
              {title}
            </Text>
            <View className="flex-row items-center gap-1.5">
              <Ionicons name="location" size={16} color={colors.foregroundMuted} />
              <Text variant="bodySm" tone="secondary">
                {service.city}
              </Text>
            </View>
          </View>

          {service.description ? (
            <View className="gap-2">
              <Text variant="sectionTitle">{t('marketplace.detail.about')}</Text>
              <Text tone="secondary">{service.description}</Text>
            </View>
          ) : null}

          {provider.description ? (
            <View className="gap-2">
              <Text variant="sectionTitle">{provider.businessName}</Text>
              <Text tone="secondary">{provider.description}</Text>
            </View>
          ) : null}

          <View className="gap-3">
            <Text variant="sectionTitle">{t('marketplace.detail.contact')}</Text>
            <View className="flex-row gap-2.5">
              <Button
                variant="outline"
                fullWidth={false}
                className="flex-1"
                label={t('marketplace.detail.call')}
                icon={<Ionicons name="call" size={18} color={colors.accentText} />}
                onPress={() => Linking.openURL(`tel:+${digits(provider.phone)}`)}
              />
              <Button
                variant="outline"
                fullWidth={false}
                className="flex-1"
                label="WhatsApp"
                icon={<Ionicons name="logo-whatsapp" size={20} color={colors.valid} />}
                onPress={() => Linking.openURL(`https://wa.me/${digits(whatsapp)}?text=${encodeURIComponent(title)}`)}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {canRequest ? (
        <StickyActionBar
          caption={format.unit(service.unit)}
          amount={formatMoney(service.price)}
          actionLabel={t('marketplace.detail.request')}
          onAction={() => router.push({ pathname: '/services/[id]/request', params: { id: service.id } })}
        />
      ) : null}
    </View>
  );
}
