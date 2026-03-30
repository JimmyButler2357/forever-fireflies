import { Stack } from 'expo-router';

/**
 * Main app layout — stack navigator (NOT tabs).
 * Home is the hub; everything else pushes onto the stack.
 */
export default function MainLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="home" />
      <Stack.Screen name="recording" />
      <Stack.Screen name="entry-detail" />
      <Stack.Screen name="firefly-jar" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="prompts" />
      <Stack.Screen name="discover" />
      <Stack.Screen name="faq" />
      <Stack.Screen name="contact" />
      <Stack.Screen name="empty-state" />
    </Stack>
  );
}
