import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { cn } from '@/lib/cn';
import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme } from '@/theme';

type RoleCardProps = {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  title: string;
  description: string;
  tag?: string;
  selected: boolean;
  onPress: () => void;
};

export function RoleCard({ icon, title, description, tag, selected, onPress }: RoleCardProps) {
  const { colors } = useTheme();

  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      className={cn(
        'flex-row items-center gap-3.5 rounded-2xl bg-surface-raised',
        selected ? 'border-2 border-accent-text p-[13px]' : 'border border-border p-3.5',
      )}
    >
      <View
        className={cn(
          'h-11 w-11 shrink-0 items-center justify-center rounded-xl',
          selected ? 'bg-action' : 'border border-border bg-background',
        )}
      >
        <MaterialCommunityIcons name={icon} size={22} color={selected ? colors.onAction : colors.foregroundSecondary} />
      </View>
      <View className="flex-1 gap-[3px]">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text variant="subheading">{title}</Text>
          {tag ? (
            <View className="rounded-full bg-background px-2 py-0.5">
              <Text variant="tag" tone="muted">
                {tag}
              </Text>
            </View>
          ) : null}
        </View>
        <Text variant="bodySm" tone="secondary">
          {description}
        </Text>
      </View>
      <View
        className={cn(
          'h-[22px] w-[22px] shrink-0 rounded-full',
          selected ? 'border-[6px] border-accent-text bg-background' : 'border-2 border-border',
        )}
      />
    </PressableScale>
  );
}
