import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { SPRING } from '@/lib/motion';
import { useTheme } from '@/theme';

type PagerDotsProps = {
  count: number;
  active: number;
  onSelect?: (index: number) => void;
  getLabel?: (index: number) => string;
};

const DOT = 8;
const ACTIVE_DOT = 24;

function Dot({ active }: { active: boolean }) {
  const { colors } = useTheme();
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = reduceMotion ? (active ? 1 : 0) : withSpring(active ? 1 : 0, SPRING.snappy);
  }, [active, progress, reduceMotion]);

  const style = useAnimatedStyle(() => ({
    width: DOT + (ACTIVE_DOT - DOT) * progress.value,
    opacity: 0.4 + 0.6 * progress.value,
  }));

  return (
    <Animated.View
      className="h-2 rounded-full"
      style={[{ backgroundColor: active ? colors.accentText : colors.foregroundSecondary }, style]}
    />
  );
}

export function PagerDots({ count, active, onSelect, getLabel }: PagerDotsProps) {
  return (
    <View className="flex-row items-center gap-1.5">
      {Array.from({ length: count }, (_, index) => (
        <Pressable
          key={index}
          accessibilityRole="button"
          accessibilityLabel={getLabel?.(index)}
          accessibilityState={{ selected: index === active }}
          disabled={!onSelect}
          onPress={() => onSelect?.(index)}
          hitSlop={8}
        >
          <Dot active={index === active} />
        </Pressable>
      ))}
    </View>
  );
}
