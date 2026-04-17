import { useState } from 'react';
import { View, Pressable, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows } from '@/constants/theme';
import { useSubscription } from '@/hooks/useSubscription';
import PostTrialPaywall from '@/components/PostTrialPaywall';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

/**
 * Custom bottom tab bar with a raised center Record button.
 *
 * 5 positions: Home, Journal, Record (center), Calendar, Favorites.
 * Record is not a real tab — it opens the recording modal or
 * the paywall if the user doesn't have an active subscription.
 */

const TAB_ICONS: Record<string, { active: string; inactive: string }> = {
  home: { active: 'home', inactive: 'home-outline' },
  journal: { active: 'book', inactive: 'book-outline' },
  calendar: { active: 'calendar', inactive: 'calendar-outline' },
  favorites: { active: 'heart', inactive: 'heart-outline' },
};

const TAB_HEIGHT = 90;
const RECORD_SIZE = 64;
const RECORD_RAISE = 24;

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { hasAccess } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  // state.routes only contains real tabs (href: null excludes Record).
  // We render the first 2 tabs, then the Record button, then the rest.
  const routes = state.routes;

  const renderTab = (route: typeof routes[number], index: number) => {
    const { options } = descriptors[route.key];
    const label = options.title ?? route.name;
    const isFocused = state.index === index;
    const icons = TAB_ICONS[route.name] ?? TAB_ICONS.home;
    const iconName = isFocused ? icons.active : icons.inactive;
    const tintColor = isFocused ? colors.accent : colors.textMuted;

    return (
      <Pressable
        key={route.key}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
        style={styles.tab}
      >
        <Ionicons
          name={iconName as any}
          size={24}
          color={tintColor}
        />
        <Text style={[styles.label, { color: tintColor }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  // Split routes into left pair (Home, Journal) and right pair (Calendar, Favorites)
  const leftTabs = routes.slice(0, 2);
  const rightTabs = routes.slice(2);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.bar}>
        {/* Left tabs: Home, Journal */}
        {leftTabs.map((route, index) => renderTab(route, index))}

        {/* Center: raised Record button (not a real tab) */}
        <Pressable
          onPress={() => {
            if (hasAccess) {
              router.push('/(main)/recording');
            } else {
              setShowPaywall(true);
            }
          }}
          style={({ pressed }) => [
            styles.recordWrapper,
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={styles.recordButton}>
            <Ionicons name="mic" size={28} color="#FFFFFF" />
          </View>
        </Pressable>

        {/* Right tabs: Calendar, Favorites */}
        {rightTabs.map((route, index) => renderTab(route, index + 2))}
      </View>

      <PostTrialPaywall
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.sm,
  },
  bar: {
    flexDirection: 'row',
    height: TAB_HEIGHT - 34, // ~56px for the icon+label area (safe area is separate)
    alignItems: 'center',
    justifyContent: 'space-around',
    overflow: 'visible',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(1), // 4px between icon and label
    paddingTop: spacing(2), // 8px
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
  },
  recordWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    // Allow the raised button to extend above the bar
    overflow: 'visible',
    marginTop: -RECORD_RAISE,
  },
  recordButton: {
    width: RECORD_SIZE,
    height: RECORD_SIZE,
    borderRadius: RECORD_SIZE / 2,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    // Warm accent shadow matching spec
    ...Platform.select({
      ios: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
});
