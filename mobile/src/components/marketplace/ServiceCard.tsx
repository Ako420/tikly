import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image, Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import type { ServiceListItem } from '@/features/marketplace/types';
import { formatMoney } from '@/lib/money';
import { useTheme } from '@/theme';
import { CATEGORY_ICONS } from './CategoryGrid';

export function ServiceCard({ service, onPress }: { service: ServiceListItem; onPress: () => void }) {
  const { colors } = useTheme();
  const format = useMarketplaceFormat();
  const title = format.text(service.title);
  const photo = service.photos[0];
  const provider = service.provider;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatMoney(service.price)} ${format.unit(service.unit)}`}
      onPress={onPress}
      className="flex-row gap-3 rounded-[18px] border border-border bg-surface-raised p-2.5"
    >
      {photo ? (
        <Image source={{ uri: photo }} className="h-24 w-24 rounded-xl" />
      ) : (
        <View className="h-24 w-24 items-center justify-center rounded-xl bg-surface">
          <MaterialCommunityIcons name={CATEGORY_ICONS[service.category]} size={32} color={colors.accentText} />
        </View>
      )}
      <View className="flex-1 gap-[3px] py-0.5">
        {provider ? (
          <View className="flex-row items-center gap-1">
            <Text variant="captionStrong" tone="secondary" numberOfLines={1} className="shrink">
              {provider.businessName}
            </Text>
            <MaterialCommunityIcons name="check-decagram" size={15} color={colors.accentText} />
          </View>
        ) : null}
        <Text variant="subheading" numberOfLines={2}>
          {title}
        </Text>
        {provider && provider.ratingCount > 0 ? (
          <View className="flex-row items-center gap-1">
            <Ionicons name="star" size={14} color={colors.accentText} />
            <Text variant="label">{provider.ratingAvg.toFixed(1)}</Text>
            <Text variant="caption" tone="muted">{`(${provider.ratingCount})`}</Text>
          </View>
        ) : null}
        <View className="mt-auto flex-row items-baseline gap-1">
          <Text variant="amount">{formatMoney(service.price)}</Text>
          <Text variant="captionSm" tone="muted">
            {format.unit(service.unit)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
