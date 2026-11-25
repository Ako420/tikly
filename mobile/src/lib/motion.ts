import * as Haptics from 'expo-haptics';
import { Easing, FadeIn, FadeInDown, FadeOut, ReduceMotion, type WithSpringConfig } from 'react-native-reanimated';

export const DURATION = { fast: 120, base: 220, slow: 320 } as const;

export const SPRING = {
  press: { damping: 18, stiffness: 420, mass: 0.6 },
  snappy: { damping: 16, stiffness: 220, mass: 0.8 },
  bouncy: { damping: 10, stiffness: 180, mass: 0.7 },
} satisfies Record<string, WithSpringConfig>;

export const EASE_OUT = Easing.bezier(0.2, 0, 0, 1);

const STAGGER_MS = 45;
const STAGGER_LIMIT = 8;

export const staggerDelay = (index: number) => (index < STAGGER_LIMIT ? index * STAGGER_MS : 0);

export const listEntering = (index: number) =>
  FadeInDown.delay(staggerDelay(index)).duration(DURATION.slow).easing(EASE_OUT).withInitialValues({ transform: [{ translateY: 14 }] }).reduceMotion(ReduceMotion.System);

export const contentEntering = FadeIn.duration(DURATION.base).reduceMotion(ReduceMotion.System);

export const contentExiting = FadeOut.duration(DURATION.fast).reduceMotion(ReduceMotion.System);

export const haptic = {
  tap: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined),
  select: () => Haptics.selectionAsync().catch(() => undefined),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => undefined),
};
