import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Detects when the user stops interacting with the screen.
 *
 * Think of it like a motion sensor light — it turns on when you're
 * still, and resets when you move. Here, "idle" means "no touches
 * for a set period," which triggers ambient firefly animations.
 *
 * Returns:
 * - `isIdle` — true when the user hasn't touched for `timeoutMs`
 * - `onActivity` — call this on touch events (onTouchStart, onScroll, etc.)
 *
 * Usage:
 *   const { isIdle, onActivity } = useIdleDetection(2000);
 *   <View onTouchStart={onActivity}>
 */
export function useIdleDetection(timeoutMs = 2000) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Start the idle timer on mount — fireflies appear after
  // the timeout elapses without any touch input
  useEffect(() => {
    timerRef.current = setTimeout(() => setIsIdle(true), timeoutMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [timeoutMs]);

  const onActivity = useCallback(() => {
    setIsIdle(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsIdle(true), timeoutMs);
  }, [timeoutMs]);

  return { isIdle, onActivity };
}
