import { Pressable, View } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from './Text';

type Segment<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="tablist" className="h-12 flex-row rounded-[14px] border border-border bg-surface p-1">
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(segment.value)}
            className={cn('flex-1 items-center justify-center rounded-[10px]', active && 'bg-action')}
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
