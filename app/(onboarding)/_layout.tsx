import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="add-child" />
      <Stack.Screen name="mic-permission" />
      <Stack.Screen name="location-permission" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="first-recording" />
      <Stack.Screen name="first-memory-text" />
      <Stack.Screen name="memory-saved" />
      <Stack.Screen name="welcome-preview" />
      <Stack.Screen name="paywall" />
    </Stack>
  );
}
