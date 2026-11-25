import { useEffect, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { haptic, SPRING } from '@/lib/motion';
import { Text } from './Text';

type Segment<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

const INSET = 4;

export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  const reduceMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const activeIndex = Math.max(
    segments.findIndex((segment) => segment.value === value),
    0,
  );
  const segmentWidth = segments.length ? (width - INSET * 2) / segments.length : 0;
  const offset = useSharedValue(0);

  useEffect(() => {
    const target = segmentWidth * activeIndex;
    offset.value = reduceMotion ? target : withSpring(target, SPRING.snappy);
  }, [activeIndex, segmentWidth, offset, reduceMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  return (
    <View
      accessibilityRole="tablist"
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      className="h-12 flex-row rounded-[14px] border border-border bg-surface p-1"
    >
      {segmentWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          className="absolute bottom-1 left-1 top-1 rounded-[10px] bg-action"
          style={[{ width: segmentWidth }, indicatorStyle]}
        />
      ) : null}
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) haptic.select();
              onChange(segment.value);
            }}
            className="flex-1 items-center justify-center rounded-[10px]"
          >
            <Text variant={active ? 'link' : 'bodySmStrong'} tone={active ? 'onAction' : 'secondary'}>
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
