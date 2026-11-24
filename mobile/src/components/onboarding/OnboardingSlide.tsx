import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTheme, withAlpha } from '@/theme';

export const HERO_HEIGHT = 440;

type OnboardingSlideProps = {
  width: number;
  image: ImageSourcePropType;
  eyebrow: string;
  title: string;
  body: string;
  preview: ReactNode;
};

export function OnboardingSlide({ width, image, eyebrow, title, body, preview }: OnboardingSlideProps) {
  const { colors } = useTheme();

  return (
    <View style={{ width }}>
      <View style={{ height: HERO_HEIGHT }}>
        <Image source={image} resizeMode="cover" className="absolute inset-0" accessibilityIgnoresInvertColors />
        <LinearGradient
          colors={[colors.media, withAlpha(colors.media, 0)]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160, opacity: 0.8 }}
        />
        <LinearGradient
          colors={[withAlpha(colors.background, 0), colors.background]}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 240 }}
        />
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
