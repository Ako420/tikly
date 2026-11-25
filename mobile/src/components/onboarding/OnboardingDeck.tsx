import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, type ReactNode } from 'react';
import { Image, Pressable, View, type ImageSourcePropType } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/Text';
import { SPRING } from '@/lib/motion';
import { palette, withAlpha } from '@/theme';

export type DeckCard = {
  key: string;
  image: ImageSourcePropType;
  label: string;
  preview: ReactNode;
};

type OnboardingDeckProps = {
  cards: DeckCard[];
  active: number;
  width: number;
  height: number;
  onAdvance: () => void;
};

const PEEK = 22;
const FLY_OUT_MS = 320;
const FLY_BACK_MS = 420;

function DeckCardView({
  card,
  position,
  count,
  width,
  height,
}: {
  card: DeckCard;
  position: number;
  count: number;
  width: number;
  height: number;
}) {
  const reduceMotion = useReducedMotion();
  const pos = useSharedValue(position);
  const fly = useSharedValue(0);
  const previous = useRef(position);

  useEffect(() => {
    const leavingFront = previous.current === 0 && position === count - 1 && count > 1;
    previous.current = position;
    if (reduceMotion) {
      pos.value = withTiming(position, { duration: 0 });
      return;
    }
    if (leavingFront) {
      fly.value = withSequence(
        withTiming(1, { duration: FLY_OUT_MS, easing: Easing.in(Easing.cubic) }),
        withTiming(0, { duration: FLY_BACK_MS, easing: Easing.out(Easing.cubic) }),
      );
      pos.value = withDelay(FLY_OUT_MS, withTiming(position, { duration: 0 }));
    } else {
      pos.value = withSpring(position, SPRING.snappy);
    }
  }, [position, count, reduceMotion, pos, fly]);

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(pos.value, [0, 1, 2], [-2, 4, -6]) - fly.value * 16;
    return {
      zIndex: Math.round((count - pos.value) * 10),
      transform: [
        { translateX: -fly.value * width * 1.15 },
        { translateY: -pos.value * PEEK + fly.value * 40 },
        { scale: 1 - pos.value * 0.06 },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const amberStyle = useAnimatedStyle(() => ({ opacity: interpolate(pos.value, [0, 1, 2], [0, 0.92, 0], 'clamp') }));
  const violetStyle = useAnimatedStyle(() => ({ opacity: interpolate(pos.value, [1, 2], [0, 0.94], 'clamp') }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: interpolate(pos.value, [0, 0.6], [1, 0], 'clamp') }));

  return (
    <Animated.View
      className="absolute overflow-hidden rounded-[28px] border border-white/20 bg-surface"
      style={[{ width, height, bottom: 0 }, cardStyle]}
      accessibilityElementsHidden={position !== 0}
      importantForAccessibility={position === 0 ? 'auto' : 'no-hide-descendants'}
    >
      <Image
        source={card.image}
        resizeMode="cover"
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
        accessibilityIgnoresInvertColors
      />
      <LinearGradient
        colors={[withAlpha(palette.violet950, 0.75), withAlpha(palette.violet950, 0)]}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 140 }}
      />
      <LinearGradient
        colors={[withAlpha(palette.violet950, 0), withAlpha(palette.violet950, 0.7)]}
        style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 200 }}
      />
      <Animated.View pointerEvents="none" className="absolute inset-0" style={[{ backgroundColor: palette.amber400 }, amberStyle]} />
      <Animated.View pointerEvents="none" className="absolute inset-0" style={[{ backgroundColor: palette.violet600 }, violetStyle]} />
      <Animated.View className="flex-1 justify-between px-3 pb-3 pt-5" style={contentStyle}>
        <Text variant="titleLg" className="text-center" style={{ color: palette.white }}>
          {card.label}
        </Text>
        <View>{card.preview}</View>
      </Animated.View>
    </Animated.View>
  );
}

export function OnboardingDeck({ cards, active, width, height, onAdvance }: OnboardingDeckProps) {
  const count = cards.length;
  const deckHeight = height + PEEK * Math.min(count - 1, 2);

  return (
    <Pressable
      onPress={onAdvance}
      accessibilityRole="button"
      accessibilityLabel={cards[active]?.label}
      accessibilityHint={cards[(active + 1) % count]?.label}
      style={{ width, height: deckHeight }}
      className="items-center"
    >
      {cards.map((card, index) => (
        <DeckCardView
          key={card.key}
          card={card}
          position={(index - active + count) % count}
          count={count}
          width={width}
          height={height}
        />
      ))}
    </Pressable>
  );
}
