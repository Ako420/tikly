import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useMarketplaceFormat } from '@/features/marketplace/format';
import type { ServiceCategory } from '@/features/marketplace/types';
import { cn } from '@/lib/cn';
import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export const CATEGORY_ICONS: Record<ServiceCategory, IconName> = {
  hall: 'office-building',
  chairs: 'sofa-single',
  canopy: 'tent',
  sound: 'speaker',
  catering: 'silverware-fork-knife',
  decoration: 'flower',
  other: 'dots-horizontal-circle',
};

const GRID: ServiceCategory[] = ['hall', 'chairs', 'canopy', 'sound', 'catering', 'decoration'];

type CategoryGridProps = { selected?: ServiceCategory; onSelect: (category: ServiceCategory | undefined) => void };

export function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  const { colors } = useTheme();
  const format = useMarketplaceFormat();

  return (
    <View className="flex-row flex-wrap gap-2.5">
      {GRID.map((category) => {
        const active = category === selected;
        return (
          <PressableScale
            key={category}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(active ? undefined : category)}
            className={cn(
              'h-[84px] basis-[30%] grow items-center justify-center gap-1.5 rounded-2xl',
              active ? 'bg-accent' : 'border border-border bg-surface-raised',
            )}
          >
            <MaterialCommunityIcons name={CATEGORY_ICONS[category]} size={26} color={active ? colors.onAccent : colors.accentText} />
            <Text variant="label" tone={active ? 'onAccent' : 'primary'}>
              {format.category(category)}
            </Text>
          </PressableScale>
        );
      })}
    </View>
  );
}
