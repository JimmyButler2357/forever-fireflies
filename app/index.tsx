import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

/**
 * Root index — redirects to onboarding or main app
 * based on whether onboarding has been completed.
 */
export default function RootIndex() {
  const hasCompletedOnboarding = useAuthStore((s) => s.hasCompletedOnboarding);

  if (hasCompletedOnboarding) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/(onboarding)" />;
}
