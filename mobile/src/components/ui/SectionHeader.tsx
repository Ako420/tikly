import { Pressable, View } from 'react-native';
import { cn } from '@/lib/cn';
import { Text } from './Text';

type SectionHeaderProps = {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  note?: string;
  className?: string;
};

export function SectionHeader({ title, actionLabel, onAction, note, className }: SectionHeaderProps) {
  return (
    <View className={cn('flex-row items-end justify-between gap-3', className)}>
      <Text variant="sectionTitle" accessibilityRole="header" className="flex-1" numberOfLines={1}>
        {title}
      </Text>
      {actionLabel ? (
        <Pressable accessibilityRole="link" onPress={onAction} hitSlop={8}>
          <Text variant="link" tone="accent">
            {actionLabel}
          </Text>
        </Pressable>
      ) : note ? (
        <Text variant="caption" tone="muted">
          {note}
        </Text>
      ) : null}
    </View>
  );
}
