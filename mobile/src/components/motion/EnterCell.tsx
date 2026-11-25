import type { ReactNode } from 'react';
import type { LayoutChangeEvent, StyleProp, ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import { listEntering } from '@/lib/motion';

type EnterCellProps = {
  index: number;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
};

export function EnterCell({ index, children, style, onLayout }: EnterCellProps) {
  return (
    <Animated.View style={style} onLayout={onLayout} entering={listEntering(index)}>
      {children}
    </Animated.View>
  );
}

export function EnterItem({ index, children, className }: { index: number; children?: ReactNode; className?: string }) {
  return (
    <Animated.View className={className} entering={listEntering(index)}>
      {children}
    </Animated.View>
  );
}
