import type { ReactNode } from 'react';
import { Image, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';

type EventSummaryCardProps = {
  title: string;
  meta: string;
  coverUrl?: string;
  children?: ReactNode;
  className?: string;
};

export function EventSummaryCard({ title, meta, coverUrl, children, className }: EventSummaryCardProps) {
  return (
    <View className={cn('gap-3 rounded-2xl border border-border bg-surface-raised p-2.5', className)}>
      <View className="flex-row items-center gap-3">
        {coverUrl ? <Image source={{ uri: coverUrl }} resizeMode="cover" className="h-[60px] w-[60px] rounded-xl" /> : null}
        <View className="flex-1 gap-0.5">
          <Text variant="subheading" numberOfLines={2}>
            {title}
          </Text>
          <Text variant="caption" tone="muted" numberOfLines={1}>
            {meta}
          </Text>
        </View>
      </View>
      {children}
    </View>
  );
}
