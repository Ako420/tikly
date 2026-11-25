import FontAwesome from '@expo/vector-icons/FontAwesome';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n/I18nProvider';
import { copyToClipboard, shareNative, shareToFacebook, shareToWhatsApp } from '@/lib/share';
import { useTheme } from '@/theme';

const COPIED_RESET_MS = 2000;

type ShareTilesProps = {
  url: string;
  message: string;
};

function Tile({ icon, label, onPress }: { icon: ReactNode; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="flex-1 items-center gap-1.5">
      <View className="h-14 w-14 items-center justify-center rounded-full border border-border bg-surface-raised">{icon}</View>
      <Text variant="tag" tone="secondary" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ShareTiles({ url, message }: ShareTilesProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), COPIED_RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyLink = async () => {
    await copyToClipboard(url);
    setCopied(true);
  };

  return (
    <View className="flex-row gap-2.5">
      <Tile
        label="WhatsApp"
        icon={<FontAwesome name="whatsapp" size={24} color={colors.foreground} />}
        onPress={() => shareToWhatsApp(`${message} ${url}`)}
      />
      <Tile label="Facebook" icon={<FontAwesome name="facebook" size={22} color={colors.foreground} />} onPress={() => shareToFacebook(url)} />
      <Tile
        label="Instagram"
        icon={<FontAwesome name="instagram" size={24} color={colors.foreground} />}
        onPress={() => shareNative(`${message} ${url}`)}
      />
      <Tile
        label={copied ? t('events.linkCopied') : t('events.copyLink')}
        icon={<Ionicons name={copied ? 'checkmark' : 'link'} size={24} color={copied ? colors.valid : colors.foreground} />}
        onPress={copyLink}
      />
    </View>
  );
}
