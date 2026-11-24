import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { ThemeScope, palette } from '@/theme';

type MapPreviewProps = {
  pinLabel?: string;
  waterLabel?: string;
  onPress: () => void;
  accessibilityLabel: string;
};

export function MapPreview({ pinLabel, waterLabel, onPress, accessibilityLabel }: MapPreviewProps) {
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={accessibilityLabel} onPress={onPress}>
      <ThemeScope scheme="dark" className="h-[190px] w-full overflow-hidden rounded-[20px] border border-border bg-surface-raised">
        <View className="absolute -left-10 top-24 h-14 w-[480px] -rotate-12 bg-primary opacity-50" />
        <View className="absolute left-0 top-12 h-1.5 w-full rotate-6 bg-border" />
        <View className="absolute -top-5 left-[120px] h-[260px] w-1.5 rotate-12 bg-border" />
        <View className="absolute -top-5 left-[250px] h-[260px] w-1.5 -rotate-6 bg-border" />
        <View className="absolute left-10 top-[60px] h-[140px] w-2 rotate-[30deg] bg-foreground-muted opacity-60" />
        <View className="absolute left-[150px] top-10 items-center">
          {pinLabel ? (
            <>
              <View className="rounded-full bg-white px-2.5 py-1">
                <Text variant="label" style={{ color: palette.violet950 }}>
                  {pinLabel}
                </Text>
              </View>
              <View className="h-2.5 w-0.5 bg-white" />
            </>
          ) : null}
          <View className="h-10 w-10 items-center justify-center rounded-full border-4 border-background bg-accent">
            <Ionicons name="location" size={18} color={palette.violet950} />
          </View>
        </View>
        {waterLabel ? (
          <Text variant="captionSm" tone="muted" className="absolute bottom-4 left-6 italic">
            {waterLabel}
          </Text>
        ) : null}
      </ThemeScope>
    </Pressable>
  );
}
