import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Root index — the app's "traffic cop."
 *
 * Routes the user based on their auth state:
 * 1. No session → onboarding (sign in first)
 * 2. Session but onboarding incomplete → resume onboarding
 * 3. Session + onboarding complete → home screen
 *
 * The _layout.tsx shows a loading screen until auth is resolved,
 * so by the time this component renders, we know the real state.
 */
export default function RootIndex() {
  const session = useAuthStore((s) => s.session);
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);

  // No session — user needs to sign in
  if (!session) {
    return <Redirect href="/(onboarding)" />;
  }

  // Session exists but onboarding not finished — pick up where they left off
  if (!hasCompletedOnboarding) {
    return <Redirect href="/(onboarding)/add-child" />;
  }

  // Fully set up — go to main app
  return <Redirect href="/(main)/(tabs)/home" />;
}
