import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { contentEntering } from '@/lib/motion';

export function FadeInView({ children, className, style }: { children?: ReactNode; className?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View className={className} style={style} entering={contentEntering}>
      {children}
    </Animated.View>
  );
}
