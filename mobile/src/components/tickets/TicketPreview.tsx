import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { CURRENCY, formatAmount } from '@/lib/money';
import { ThemeScope, useTheme } from '@/theme';

type TicketPreviewProps = {
  eyebrow: string;
  title: string;
  venue: string;
  tier: string;
  price: number;
  className?: string;
};

const shadows = {
  light: '0px 16px 32px -12px rgba(20, 10, 69, 0.22)',
  dark: '0px 18px 40px -12px rgba(0, 0, 0, 0.45)',
};

export function TicketPreview({ eyebrow, title, venue, tier, price, className }: TicketPreviewProps) {
  const { scheme, colors } = useTheme();
  const notch = { backgroundColor: colors.background };

  return (
    <ThemeScope
      scheme="light"
      className={cn('h-24 flex-row rounded-card bg-surface-raised', className)}
      style={{ boxShadow: shadows[scheme] }}
    >
      <View className="flex-1 justify-center gap-1 pl-[18px] pr-3">
        <Text variant="overline" tone="accent" numberOfLines={1}>
          {eyebrow}
        </Text>
        <Text variant="title" numberOfLines={1}>
          {title}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {venue}
        </Text>
      </View>
      <View className="relative w-px border-l-2 border-dashed border-border">
        <View className="absolute -left-[11px] -top-[10px] h-5 w-5 rounded-full" style={notch} />
        <View className="absolute -bottom-[10px] -left-[11px] h-5 w-5 rounded-full" style={notch} />
      </View>
      <View className="w-[104px] shrink-0 items-center justify-center gap-0.5">
        <Text variant="overline" tone="secondary">
          {tier}
        </Text>
        <Text variant="amount">{formatAmount(price)}</Text>
        <Text variant="micro" tone="secondary">
          {CURRENCY}
        </Text>
      </View>
    </ThemeScope>
  );
}
