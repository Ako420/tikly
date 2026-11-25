import { Pressable, View } from 'react-native';
import { cn } from '@/lib/cn';

type PagerDotsProps = {
  count: number;
  active: number;
  onSelect?: (index: number) => void;
  getLabel?: (index: number) => string;
};

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
          className={cn('h-2 rounded-full', index === active ? 'w-6 bg-accent-text' : 'w-2 bg-foreground-secondary opacity-40')}
        />
      ))}
    </View>
  );
}
