import { View } from 'react-native';
import { Text } from './Text';

type ScreenHeadingProps = {
  eyebrow: string;
  title: string;
  subtitle?: string;
};

export function ScreenHeading({ eyebrow, title, subtitle }: ScreenHeadingProps) {
  return (
    <View className="gap-2.5">
      <Text variant="eyebrow" tone="accent">
        {eyebrow}
      </Text>
      <Text variant="display" accessibilityRole="header">
        {title}
      </Text>
      {subtitle ? <Text tone="secondary">{subtitle}</Text> : null}
    </View>
  );
}
