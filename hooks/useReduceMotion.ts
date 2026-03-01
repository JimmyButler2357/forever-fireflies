import { useState, useEffect } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook that checks the device's "Reduce Motion" accessibility setting.
 *
 * When true, screens should skip decorative animations (fadeInUp, pulse,
 * breathing circle, etc.) while keeping functional ones (navigation
 * transitions, button press feedback).
 *
 * Think of it like a "calm mode" switch — everything still works,
 * but without the visual flourishes.
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    // Check once on mount
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);

    // Listen for changes
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );

    return () => sub.remove();
  }, []);

  return reduceMotion;
}
