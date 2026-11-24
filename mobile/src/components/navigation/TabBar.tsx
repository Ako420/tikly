import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const tabIcons: Record<string, { active: IconName; inactive: IconName }> = {
  home: { active: 'home', inactive: 'home-outline' },
  explore: { active: 'search', inactive: 'search-outline' },
  tickets: { active: 'ticket', inactive: 'ticket-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
};

export function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View
      className="flex-row items-start justify-around border-t border-border bg-surface-raised px-4 pt-2.5"
      style={{ paddingBottom: Math.max(insets.bottom, 12) }}
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const icons = tabIcons[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
        const color = focused ? colors.accentText : colors.foregroundMuted;
        const label = t(`tabs.${route.name}`);

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            onPress={() => {
              const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigateToTab(route.key);
            }}
            onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
            className="w-[72px] items-center gap-1"
          >
            <Ionicons name={focused ? icons.active : icons.inactive} size={24} color={color} />
            <Text variant="tag" style={{ color }}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
