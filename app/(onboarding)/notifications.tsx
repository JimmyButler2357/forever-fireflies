import { useState, useRef, useCallback } from 'react';
import { View, Text, Pressable, FlatList, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '@/constants/theme';
import { profilesService } from '@/services/profiles.service';
import { notificationsService } from '@/services/notifications.service';
import { useAuthStore } from '@/stores/authStore';
import { requestPermissions, getExpoPushToken } from '@/lib/notifications';
import { to24Hour } from '@/lib/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PrimaryButton from '@/components/PrimaryButton';

// Generate all 48 half-hour slots across 24 hours (12:00 AM → 11:30 PM).
// Think of it like listing every half-hour mark on a clock for a full day.
const TIMES: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const period = h < 12 ? 'AM' : 'PM';
    TIMES.push(`${hour12}:${m} ${period}`);
  }
}

// To create a "wrap-around" effect, we repeat the list 3 times and start
// in the middle copy. Think of it like a conveyor belt loop — when you
// scroll near an edge, we silently jump you back to the center so it
// feels like it never ends.
const REPEAT_COUNT = 3;
const TOTAL_ITEMS = TIMES.length * REPEAT_COUNT; // 144
const ROW_HEIGHT = 44;

const DEFAULT_TIME = '8:30 PM';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedTime, setSelectedTime] = useState(DEFAULT_TIME);
  const [isLoading, setIsLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  // Start in the middle copy, scrolled to the default time's position.
  const defaultIndex = TIMES.length + TIMES.indexOf(DEFAULT_TIME);

  const goNext = () => router.push('/(onboarding)/first-recording');

  // When scrolling stops, check if we've drifted into the first or last
  // copy. If so, silently jump to the same position in the middle copy.
  // The user won't notice because all three copies look identical.
  const handleScrollEnd = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    const oneSetHeight = TIMES.length * ROW_HEIGHT;

    if (y < oneSetHeight * 0.5) {
      // Drifted into the first copy — jump forward by one full set
      listRef.current?.scrollToOffset({ offset: y + oneSetHeight, animated: false });
    } else if (y > oneSetHeight * 2.5) {
      // Drifted into the last copy — jump back by one full set
      listRef.current?.scrollToOffset({ offset: y - oneSetHeight, animated: false });
    }
  }, []);

  // Save the selected time, request OS permission, and register the
  // device's push token so the server knows where to send notifications.
  // If anything fails, we still navigate forward — they can fix it
  // later in Settings.
  const handleSetReminder = async () => {
    setIsLoading(true);
    try {
      // Save time preference to Supabase
      const time24 = to24Hour(selectedTime);
      await profilesService.updateNotificationPrefs({
        notification_enabled: true,
        notification_time: time24,
      });

      // Also sync timezone + compute UTC equivalent so the server
      // knows when to send. Fire-and-forget — don't block navigation.
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        profilesService.syncTimezone(tz, time24).catch(
          (err) => console.warn('Failed to sync timezone:', err)
        );
      }

      // Request OS notification permission (shows the system dialog).
      // Think of it like asking "can I knock on your door each evening?"
      const { granted } = await requestPermissions();

      if (granted) {
        // Get the device's push token — the "address" the server sends to
        const token = await getExpoPushToken();
        if (token) {
          const userId = useAuthStore.getState().session?.user?.id;
          if (userId) {
            // Register with Supabase (fire-and-forget — don't block navigation)
            const platform = Platform.OS as 'ios' | 'android';
            notificationsService.registerDevice(userId, token, platform).catch(
              (err) => console.warn('Failed to register device:', err)
            );
            // Store locally for logout deactivation
            AsyncStorage.setItem('ff_push_token', token).catch(() => {});
          }
        }
      }
    } catch (error) {
      // Non-blocking — the user can set this later in Settings.
      console.warn('Failed to save notification prefs:', error);
    } finally {
      setIsLoading(false);
      goNext();
    }
  };

  // User tapped "Not now" — save that they declined so the server
  // won't try to send notifications to this user.
  const handleSkip = async () => {
    profilesService.updateNotificationPrefs({
      notification_enabled: false,
    }).catch((err) => console.warn('Failed to save skip preference:', err));
    goNext();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="notifications" size={36} color={colors.glow} />
        </View>

        <Text style={styles.heading}>Don't let today's stories fade.</Text>
        <Text style={styles.subheading}>We'll send a gentle nudge to capture the day's moments.</Text>

        <View style={styles.timeList}>
          <FlatList
            ref={listRef}
            data={Array.from({ length: TOTAL_ITEMS }, (_, i) => i)}
            keyExtractor={(i) => String(i)}
            showsVerticalScrollIndicator={false}
            getItemLayout={(_, index) => ({
              length: ROW_HEIGHT,
              offset: ROW_HEIGHT * index,
              index,
            })}
            initialScrollIndex={defaultIndex}
            onMomentumScrollEnd={handleScrollEnd}
            renderItem={({ index }) => {
              const time = TIMES[index % TIMES.length];
              const isSelected = time === selectedTime;
              return (
                <Pressable
                  onPress={() => setSelectedTime(time)}
                  style={[styles.timeRow, isSelected && styles.timeRowSelected]}
                >
                  <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>
                    {time}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  )}
                </Pressable>
              );
            }}
          />
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(12) }]}>
        <PrimaryButton
          label={isLoading ? 'Saving...' : 'Set reminder'}
          onPress={handleSetReminder}
          disabled={isLoading}
        />
        <Pressable onPress={handleSkip} disabled={isLoading}>
          <Text style={styles.skipLink}>Not now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(5),
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glowGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(6),
  },
  heading: {
    ...typography.sectionHeading,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(3),
  },
  subheading: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(6),
  },
  timeList: {
    width: '100%',
    maxHeight: 280,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: ROW_HEIGHT,
    paddingHorizontal: spacing(4),
    borderRadius: radii.md,
  },
  timeRowSelected: {
    backgroundColor: colors.accentSoft,
  },
  timeText: {
    ...typography.formLabel,
    color: colors.textSoft,
  },
  timeTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  bottom: {
    gap: spacing(4),
    alignItems: 'center',
    paddingBottom: spacing(12),
  },
  skipLink: {
    ...typography.formLabel,
    color: colors.textMuted,
  },
});
