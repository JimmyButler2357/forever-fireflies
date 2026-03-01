import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';

// ─── Lightweight permission-only hook ────────────────────

/**
 * Checks whether foreground location permission is granted.
 * Does NOT trigger GPS or geocoding — just a quick permission check.
 *
 * Use this on screens that only need to know "should I show location UI?"
 * (e.g., Entry Detail, Settings). For screens that actually capture
 * location, use useLocation() instead.
 */
export function useLocationPermission(): boolean {
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (!cancelled) setGranted(status === 'granted');
    })();

    return () => { cancelled = true; };
  }, []);

  return granted;
}

// ─── Full location detection hook ────────────────────────

interface LocationState {
  /** Readable place name, e.g. "Tampa, FL" — or null if unavailable */
  locationText: string | null;
  /** True while detecting location */
  loading: boolean;
  /** Friendly error message, or null */
  error: string | null;
  /** Whether the user has granted foreground location permission */
  permissionGranted: boolean;
}

/**
 * Hook that auto-detects the device location and reverse-geocodes it
 * to a readable label like "Tampa, FL".
 *
 * Think of it like sending someone to check the address while you talk —
 * by the time you're done recording, the location is ready.
 *
 * If permission was denied or GPS fails, it returns null silently.
 * Location is always optional — never blocks the recording flow.
 */
export function useLocation(): LocationState & { refresh: () => void } {
  const [state, setState] = useState<LocationState>({
    locationText: null,
    loading: true,
    error: null,
    permissionGranted: false,
  });

  // Track whether the component is still mounted so async work
  // doesn't try to update state after unmount
  const detect = useCallback(async (cancelled: () => boolean) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // Check current permission status (doesn't trigger a prompt)
      const { status } = await Location.getForegroundPermissionsAsync();

      if (cancelled()) return;

      if (status !== 'granted') {
        setState({ locationText: null, loading: false, error: null, permissionGranted: false });
        return;
      }

      // Get coordinates — balanced accuracy is fast enough for city-level,
      // with a 10-second timeout so we don't block indoors
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
      });

      if (cancelled()) return;

      // Reverse geocode coordinates → readable address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });

      if (cancelled()) return;

      let locationText: string | null = null;
      if (address) {
        // Build a label like "Tampa, FL" or "London, England"
        const parts: string[] = [];
        if (address.city) parts.push(address.city);
        if (address.region) parts.push(address.region);

        // Fallback: if no city or region, try country
        if (parts.length === 0 && address.country) {
          parts.push(address.country);
        }

        locationText = parts.length > 0 ? parts.join(', ') : null;
      }

      setState({ locationText, loading: false, error: null, permissionGranted: true });
    } catch {
      if (cancelled()) return;
      // Silent failure — location is never required
      setState({ locationText: null, loading: false, error: 'Could not detect location', permissionGranted: false });
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    detect(() => cancelled);
    return () => { cancelled = true; };
  }, [detect]);

  // Refresh: re-run detection (e.g., user moved and wants updated location)
  const refresh = useCallback(() => {
    detect(() => false);
  }, [detect]);

  return { ...state, refresh };
}
