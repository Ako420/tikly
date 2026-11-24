import { View } from 'react-native';
import { cn } from '@/lib/cn';

export function PagerDots({ count, active }: { count: number; active: number }) {
  return (
    <View className="flex-row items-center gap-1.5" accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: count, now: active + 1 }}>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={index}
          className={cn('h-2 rounded-full', index === active ? 'w-6 bg-accent-text' : 'w-2 bg-foreground-secondary opacity-40')}
        />
      ))}
    </View>
  );
}
