import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/navigation/TabBar';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="tickets" />
      <Tabs.Screen name="marketplace" />
      <Tabs.Screen name="bookings" />
      <Tabs.Screen name="requests" />
      <Tabs.Screen name="listings" />
      <Tabs.Screen name="earnings" />
      <Tabs.Screen name="slot-events" />
      <Tabs.Screen name="my-slots" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
