import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Image, Linking, Pressable, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme, withAlpha } from '@/theme';

export const HERO_HEIGHT = 440;
const CREDIT_TOP = 150;

export type ImageCredit = { url: string };

type OnboardingSlideProps = {
  width: number;
  image: ImageSourcePropType;
  eyebrow: string;
  title: string;
  body: string;
  preview: ReactNode;
  credit?: ImageCredit;
};

export function OnboardingSlide({ width, image, eyebrow, title, body, preview, credit }: OnboardingSlideProps) {
  const { colors } = useTheme();

  return (
    <View style={{ width }}>
      <View className="overflow-hidden" style={{ height: HERO_HEIGHT }}>
        <Image
          source={image}
          resizeMode="cover"
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
          accessibilityIgnoresInvertColors
        />
        <LinearGradient
          colors={[colors.media, withAlpha(colors.media, 0)]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160, opacity: 0.8 }}
        />
        <LinearGradient
          colors={[withAlpha(colors.background, 0), colors.background]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 240 }}
        />
        {credit ? (
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL(credit.url)}
            hitSlop={6}
            className="absolute right-6 rounded-full px-2 py-0.5"
            style={{ top: CREDIT_TOP, backgroundColor: withAlpha(colors.media, 0.55) }}
          >
          </Pressable>
        ) : null}
        <View className="absolute bottom-[18px] left-7 right-7">{preview}</View>
      </View>
      <View className="gap-3 px-6 pt-6">
        <Text variant="eyebrow" tone="accent">
          {eyebrow}
        </Text>
        <Text variant="display" accessibilityRole="header">
          {title}
        </Text>
        <Text tone="secondary">{body}</Text>
      </View>
    </View>
  );
}
