import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Image, Pressable, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n/I18nProvider';
import { palette, ThemeScope, withAlpha } from '@/theme';

export const HERO_HEIGHT = 340;

type EventHeroProps = {
  photos: string[];
  onShare: () => void;
};

function HeroButton({ icon, label, onPress }: { icon: 'chevron-back' | 'share-outline'; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      className="h-11 w-11 items-center justify-center rounded-full bg-background"
      style={({ pressed }) => (pressed ? { opacity: 0.75 } : null)}
    >
      <Ionicons name={icon} size={22} color={palette.white} />
    </Pressable>
  );
}

export function EventHero({ photos, onShare }: EventHeroProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  return (
    <ThemeScope scheme="dark" style={{ height: HERO_HEIGHT }}>
      <FlatList
        data={photos}
        keyExtractor={(photo, position) => `${position}-${photo}`}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} resizeMode="cover" style={{ width, height: HERO_HEIGHT }} accessibilityIgnoresInvertColors />
        )}
      />
      <LinearGradient
        pointerEvents="none"
        colors={[palette.violet950, withAlpha(palette.violet950, 0)]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140, opacity: 0.8 }}
      />
      <View className="absolute left-0 right-0 h-[52px] flex-row items-center justify-between px-6" style={{ top: insets.top }}>
        <HeroButton icon="chevron-back" label={t('common.back')} onPress={() => router.back()} />
        <HeroButton icon="share-outline" label={t('events.share')} onPress={onShare} />
      </View>
      {photos.length > 1 ? (
        <View className="absolute bottom-11 right-6 h-7 justify-center rounded-full bg-background px-2.5">
          <Text variant="label" accessibilityLabel={t('events.photoCount', { index: index + 1, total: photos.length })}>
            {`${index + 1} / ${photos.length}`}
          </Text>
        </View>
      ) : null}
    </ThemeScope>
  );
}
