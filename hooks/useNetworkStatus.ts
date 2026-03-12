// Network status hook — monitors live internet connectivity.
//
// Think of it like a traffic light for your internet connection:
// green (online) means data can flow to Supabase, red (offline)
// means we need to save things locally until it turns green again.
//
// Uses expo-network's useNetworkState() hook, which subscribes to
// OS-level connectivity changes (WiFi on/off, airplane mode, etc.)
// and re-renders automatically when the state changes.

import { useNetworkState } from 'expo-network';

export function useNetworkStatus() {
  // useNetworkState() returns { isConnected, isInternetReachable, type }.
  // It handles all the listener setup/cleanup internally — like
  // a doorbell that installs itself and tells you when someone rings.
  const networkState = useNetworkState();

  // `isInternetReachable` is the most reliable signal.
  // `isConnected` only means "attached to a network" (you could be
  // on WiFi with no actual internet). If `isInternetReachable` is
  // null (startup / unknown), fall back to `isConnected`, then
  // default to true (optimistic — assume online until proven otherwise).
  const isOnline = networkState.isInternetReachable ?? networkState.isConnected ?? true;

  return { isOnline };
}
