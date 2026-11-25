import { Image, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { localize, type LineupArtist } from '@/features/events/types';
import { useTranslation } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';

export function ArtistCard({ artist }: { artist: LineupArtist }) {
  const { language } = useTranslation();
  const role = localize(artist.role, language);

  return (
    <View className="w-[88px] items-center gap-2" accessible accessibilityLabel={`${artist.name}, ${role}`}>
      <View className={cn('h-20 w-20 rounded-full p-[3px]', artist.headliner ? 'bg-accent-text' : 'bg-border')}>
        <Image source={{ uri: artist.photoUrl }} resizeMode="cover" className="h-full w-full rounded-full" />
      </View>
      <View className="items-center gap-px">
        <Text variant="link" className="text-center" numberOfLines={2}>
          {artist.name}
        </Text>
        <Text variant="captionSm" tone="muted" className="text-center" numberOfLines={1}>
          {role}
        </Text>
      </View>
    </View>
  );
}
