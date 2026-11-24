import Ionicons from '@expo/vector-icons/Ionicons';
import { Children, isValidElement, type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { useTheme } from '@/theme';

type SettingsGroupProps = { title: string; children: ReactNode };

export function SettingsGroup({ title, children }: SettingsGroupProps) {
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View className="gap-2">
      <Text variant="eyebrow" tone="accent" accessibilityRole="header">
        {title}
      </Text>
      <View className="overflow-hidden rounded-card border border-border bg-surface">
        {rows.map((row, index) => (
          <View key={row.key ?? index} className={cn(index > 0 && 'border-t border-border')}>
            {row}
          </View>
        ))}
      </View>
    </View>
  );
}

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  trailing?: ReactNode;
  showChevron?: boolean;
  accessibilityHint?: string;
};

export function SettingsRow({ icon, label, value, onPress, trailing, showChevron = !!onPress, accessibilityHint }: SettingsRowProps) {
  const { colors } = useTheme();

  const content = (
    <>
      <Ionicons name={icon} size={20} color={colors.foregroundSecondary} />
      <Text variant="subheading" className="flex-1" numberOfLines={1}>
        {label}
      </Text>
      {value ? (
        <Text variant="bodySm" tone="secondary" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {trailing}
      {showChevron ? <Ionicons name="chevron-forward" size={18} color={colors.foregroundMuted} /> : null}
    </>
  );

  if (!onPress) return <View className="min-h-[54px] flex-row items-center gap-3 px-4 py-3">{content}</View>;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      className="min-h-[54px] flex-row items-center gap-3 px-4 py-3 active:bg-background"
    >
      {content}
    </Pressable>
  );
}
