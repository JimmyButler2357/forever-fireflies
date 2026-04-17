import * as Linking from 'expo-linking';

/** Opens the OS settings page for this app.
 *  Thin wrapper so we can swap in platform-specific deep-links
 *  (e.g. expo-intent-launcher) later without touching every call site. */
export function openAppSettings() {
  Linking.openSettings();
}
