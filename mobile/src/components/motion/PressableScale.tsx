import type { ReactNode } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { DURATION, SPRING } from '@/lib/motion';

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
  pressedScale?: number;
};

const OUTER_CLASS = /^-?(flex-1|flex-auto|flex-none|grow|shrink|basis-|self-|w-|min-w-|max-w-|m[trblxyse]?-|absolute$|top-|bottom-|left-|right-|inset-|z-)/;

function splitClassName(className?: string) {
  const outer: string[] = [];
  const inner: string[] = [];
  for (const token of (className ?? '').split(/\s+/).filter(Boolean)) {
    (OUTER_CLASS.test(token) ? outer : inner).push(token);
  }
  return { outer: outer.join(' '), inner: inner.join(' ') };
}

export function PressableScale({ children, className, style, pressedScale = 0.97, onPressIn, onPressOut, ...props }: PressableScaleProps) {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(0);
  const { outer, inner } = splitClassName(className);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduceMotion ? 1 : 1 - (1 - pressedScale) * progress.value }],
  }));

  const handlePressIn = (event: GestureResponderEvent) => {
    progress.value = withTiming(1, { duration: DURATION.fast });
    onPressIn?.(event);
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    progress.value = withSpring(0, SPRING.press);
    onPressOut?.(event);
  };

  return (
    <Animated.View className={outer} style={animatedStyle}>
      <Pressable {...props} onPressIn={handlePressIn} onPressOut={handlePressOut} className={inner} style={style}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
