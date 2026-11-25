import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { View } from 'react-native';
import { PreviewCard } from '@/components/ui/PreviewCard';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { semanticColors } from '@/theme';

type QrTicketPreviewProps = {
  status: string;
  title: string;
  meta: string;
  className?: string;
};

export function QrTicketPreview({ status, title, meta, className }: QrTicketPreviewProps) {
  return (
    <PreviewCard className={cn('flex-row items-center gap-4 p-3.5', className)}>
      <View className="h-[84px] w-[84px] shrink-0 items-center justify-center rounded-xl border border-border">
        <MaterialCommunityIcons name="qrcode" size={64} color={semanticColors.light.foreground} />
      </View>
      <View className="flex-1 gap-1">
        <Text variant="eyebrow" tone="valid" numberOfLines={1}>
          {status}
        </Text>
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </PreviewCard>
  );
}
