import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/CustomTabBar';

/**
 * Tab navigator — the app's main navigation hub.
 *
 * 4 real tabs: Home, Journal, Calendar, Favorites.
 * The Record button is rendered by CustomTabBar between
 * Journal and Calendar — it's not a tab, just a button
 * that opens the recording modal.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: 'Home' }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Calendar' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Favorites' }} />
    </Tabs>
  );
}
