import Ionicons from '@expo/vector-icons/Ionicons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useState, type ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/features/auth/AuthProvider';
import { tabsFor } from '@/features/auth/homeRoute';
import { useTranslation } from '@/i18n/I18nProvider';
import { useTheme, withAlpha } from '@/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

const tabIcons: Record<string, { active: IconName; inactive: IconName }> = {
  home: { active: 'home', inactive: 'home-outline' },
  explore: { active: 'search', inactive: 'search-outline' },
  tickets: { active: 'ticket', inactive: 'ticket-outline' },
  profile: { active: 'person', inactive: 'person-outline' },
  'my-events': { active: 'calendar', inactive: 'calendar-outline' },
  marketplace: { active: 'bag-handle', inactive: 'bag-handle-outline' },
  bookings: { active: 'clipboard', inactive: 'clipboard-outline' },
  requests: { active: 'file-tray-full', inactive: 'file-tray-full-outline' },
  listings: { active: 'grid', inactive: 'grid-outline' },
  earnings: { active: 'cash', inactive: 'cash-outline' },
  'slot-events': { active: 'calendar', inactive: 'calendar-outline' },
  'my-slots': { active: 'storefront', inactive: 'storefront-outline' },
};

const BAR_HEIGHT = 64;
const BAR_SIDE_GUTTER = 20;
const NOTCH_SIZE = 74;
const BUBBLE_SIZE = 54;
const NOTCH_RISE = 26;
const SPRING = { damping: 16, stiffness: 180, mass: 0.8 };

export function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const { user } = useAuth();
  const visible = tabsFor(user?.role);
  const routes = state.routes.filter((route) => visible.includes(route.name));
  const activeRoute = state.routes[state.index];
  const activeSlot = Math.max(
    routes.findIndex((route) => route.key === activeRoute?.key),
    0,
  );

  const [barWidth, setBarWidth] = useState(0);
  const slotWidth = routes.length ? barWidth / routes.length : 0;
  const offsetX = useSharedValue(0);
  const pop = useSharedValue(1);

  useEffect(() => {
    if (!slotWidth) return;
    offsetX.value = withSpring(slotWidth * activeSlot + slotWidth / 2, SPRING);
    pop.value = withSequence(withTiming(0.7, { duration: 90 }), withSpring(1, SPRING));
  }, [activeSlot, slotWidth, offsetX, pop]);

  const notchStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value - NOTCH_SIZE / 2 }],
  }));

  const bubbleStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value - BUBBLE_SIZE / 2 }, { scale: pop.value }],
  }));

  const onLayout = (event: LayoutChangeEvent) => setBarWidth(event.nativeEvent.layout.width);
  const activeIcons = tabIcons[activeRoute?.name ?? ''] ?? {
    active: 'ellipse',
    inactive: 'ellipse-outline',
  };

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: BAR_SIDE_GUTTER,
        right: BAR_SIDE_GUTTER,
        bottom: Math.max(insets.bottom, 12),
      }}
    >
      <View
        onLayout={onLayout}
        style={{
          height: BAR_HEIGHT,
          borderRadius: BAR_HEIGHT / 2,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: withAlpha(colors.foreground, 0.18),
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 12,
        }}
      >
        <BlurView
          intensity={60}
          tint={scheme === 'dark' ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: withAlpha(colors.surfaceRaised, 0.72) }]} />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 16,
            right: 16,
            height: 1,
            backgroundColor: withAlpha(colors.onPrimary, 0.25),
          }}
        />
        <View className="flex-1 flex-row items-center">
          {routes.map((route, slot) => {
            const focused = slot === activeSlot;
            const icons = tabIcons[route.name] ?? {
              active: 'ellipse',
              inactive: 'ellipse-outline',
            };
            const label = t(`tabs.${route.name}`);

            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={label}
                onPress={() => {
                  const event = emitter.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    Haptics.selectionAsync();
                    navigateToTab(route.key);
                  }
                }}
                onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
                className="h-full flex-1 items-center justify-center"
              >
                <Ionicons
                  name={icons.inactive}
                  size={23}
                  color={colors.foregroundMuted}
                  style={{ opacity: focused ? 0 : 1 }}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {barWidth ? (
        <>
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                top: -NOTCH_RISE - (NOTCH_SIZE - BUBBLE_SIZE) / 2,
                width: NOTCH_SIZE,
                height: NOTCH_SIZE,
                borderRadius: NOTCH_SIZE / 2,
                backgroundColor: colors.background,
              },
              notchStyle,
            ]}
          />
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: 0,
                top: -NOTCH_RISE,
                width: BUBBLE_SIZE,
                height: BUBBLE_SIZE,
                borderRadius: BUBBLE_SIZE / 2,
                backgroundColor: colors.accent,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: colors.accent,
                shadowOpacity: 0.55,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
                elevation: 10,
              },
              bubbleStyle,
            ]}
          >
            <Ionicons name={activeIcons.active} size={24} color={colors.onAccent} />
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

export function useTabBarSpace() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom, 12) + BAR_HEIGHT + 24;
}
