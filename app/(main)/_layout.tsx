import { Stack } from 'expo-router';

/**
 * Main app layout — Stack wrapping the tab navigator + shared screens.
 *
 * Think of it like a house: the (tabs) group is the ground floor
 * where you walk between rooms (Home, Journal, Calendar, Favorites).
 * When you open a door to a detail screen (entry-detail, settings,
 * recording), you go "upstairs" — the tab bar disappears because
 * you're on a different level. Pressing Back takes you back down.
 *
 * Recording and Prompts use `presentation: 'modal'` so they slide
 * up from the bottom instead of from the right.
 */
export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="recording"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="entry-detail" />
      <Stack.Screen name="settings" />
      <Stack.Screen
        name="prompts"
        options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
      />
      <Stack.Screen name="discover" />
      <Stack.Screen name="faq" />
      <Stack.Screen name="contact" />
      <Stack.Screen name="empty-state" />
    </Stack>
  );
}
