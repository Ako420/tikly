import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import { TabBar } from '@/components/navigation/TabBar';
import { useAuth } from '@/features/auth/AuthProvider';
import { useTheme } from '@/theme';

export default function TabsLayout() {
  const { colors } = useTheme();
  const { user } = useAuth();

  if (user?.role === 'staff') return <Redirect href="/gate" />;

  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="tickets" />
      <Tabs.Screen name="my-events" />
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
