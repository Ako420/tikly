import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';

type InfoRowProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: ReactNode;
  subtitle: ReactNode;
  highlighted?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function InfoRow({ icon, title, subtitle, highlighted, onPress, accessibilityLabel }: InfoRowProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      disabled={!onPress}
      onPress={onPress}
      className="flex-row items-center gap-3.5"
    >
      <View
        className={cn(
          'h-12 w-12 shrink-0 items-center justify-center rounded-[14px]',
          highlighted ? 'bg-primary' : 'border border-border bg-surface-raised',
        )}
      >
        <Ionicons name={icon} size={22} color={highlighted ? colors.onPrimary : colors.accentText} />
      </View>
      <View className="flex-1 gap-0.5">
        {typeof title === 'string' ? <Text variant="subheading">{title}</Text> : title}
        {typeof subtitle === 'string' ? (
          <Text variant="bodySm" tone="muted">
            {subtitle}
          </Text>
        ) : (
          subtitle
        )}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={18} color={colors.foregroundMuted} /> : null}
    </Pressable>
  );
}
