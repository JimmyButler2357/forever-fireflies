import { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  AppState,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,

  minTouchTarget,
} from '@/constants/theme';
import { useChildrenStore, mapSupabaseChild } from '@/stores/childrenStore';
import { useEntriesStore, mapSupabaseEntry } from '@/stores/entriesStore';
import { useAuthStore } from '@/stores/authStore';
import { childrenService } from '@/services/children.service';
import { entriesService } from '@/services/entries.service';
import { useSubscription } from '@/hooks/useSubscription';
import { getAge } from '@/lib/dateUtils';
import TopBar from '@/components/TopBar';
import PostTrialPaywall from '@/components/PostTrialPaywall';
import BrandingBanner from '@/components/home/BrandingBanner';
import FamilySection from '@/components/home/FamilySection';
import ChildModal from '@/components/home/ChildModal';
import OnThisDaySection from '@/components/home/OnThisDaySection';
import TodaysPromptCard from '@/components/home/TodaysPromptCard';
import WeekStreaks from '@/components/home/WeekStreaks';
import ComingUpSection from '@/components/home/ComingUpSection';
import { capture } from '@/lib/posthog';
import { getPermissionStatus, requestPermissions, getExpoPushToken } from '@/lib/notifications';
import { openAppSettings } from '@/lib/openSettings';
import { notificationsService } from '@/services/notifications.service';
import NoticesBanner, { type Notice } from '@/components/home/NoticesBanner';
import { storageService } from '@/services/storage.service';

// ─── Greeting System ──────────────────────────────────────
//
// The greeting picks a random message from the current
// time-of-day pool on mount and stays fixed for the session.
// Birthday and anniversary overrides take priority.

const GREETINGS = {
  morning: [
    'Morning quiet is the best quiet',
    'Hope your coffee is still warm',
    'Another day of tiny discoveries',
  ],
  afternoon: [
    'Right in the middle of it all',
    'The afternoon stretch',
    'Hope the day is being kind',
  ],
  evening: [
    'Almost made it to bedtime',
    'The quiet part of the day',
    'The house gets softer at night',
  ],
  late: [
    'Burning the midnight oil?',
    'The house is asleep but you',
    "Can't sleep either, huh?",
  ],
};

function getTimeSlot(): keyof typeof GREETINGS {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'late';
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Home Tab ─────────────────────────────────────────────

export default function HomeTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const setChildren = useChildrenStore((s) => s.setChildren);
  const entries = useEntriesStore((s) => s.entries);
  const setEntries = useEntriesStore((s) => s.setEntries);
  const familyId = useAuthStore((s) => s.familyId);
  const profile = useAuthStore((s) => s.profile);
  const userId = useAuthStore((s) => s.session?.user?.id);

  const { hasAccess } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  // Child modal state
  const [modalChildId, setModalChildId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Loading state — only needed if Home loads before Journal
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [childPhotoUrls, setChildPhotoUrls] = useState<Record<string, string | undefined>>({});

  useEffect(() => { capture('screen_viewed', { screen: 'Home' }); }, []);

  // ─── Notification permission mismatch ─────────────────
  //
  // Detects when the user turned on reminders in Settings
  // but the phone is blocking notifications. Shows a notice
  // on the Home screen so they know something's wrong.
  // Re-checks every time the app comes to the foreground
  // (in case they just came back from phone Settings).

  const [notifMismatch, setNotifMismatch] = useState(false);

  useEffect(() => {
    if (!profile?.notification_enabled) {
      setNotifMismatch(false);
      return;
    }

    const check = () => {
      getPermissionStatus().then(({ granted }) => setNotifMismatch(!granted));
    };

    check();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });

    return () => sub.remove();
  }, [profile?.notification_enabled]);

  const notices = useMemo(() => {
    const list: Notice[] = [];

    if (notifMismatch) {
      list.push({
        id: 'notif-mismatch',
        icon: 'notifications-off-outline',
        message: 'Your reminders are paused',
        actionLabel: 'Turn on',
        onAction: async () => {
          const { granted } = await requestPermissions();
          if (granted) {
            setNotifMismatch(false);
            // Re-register push token so the server knows where to send
            try {
              const token = await getExpoPushToken();
              if (token && userId) {
                const platform = Platform.OS as 'ios' | 'android';
                await notificationsService.registerDevice(token, platform);
              }
            } catch (err) {
              console.warn('Failed to re-register push token:', err);
            }
          } else {
            // Android blocked the prompt — send to Settings as last resort
            openAppSettings();
          }
        },
      });
    }

    return list;
  }, [notifMismatch, userId]);

  // ─── Greeting (fixed for session) ──────────────────────
  const greetingRef = useRef<string | null>(null);

  if (!greetingRef.current) {
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();

    // Check for birthday override
    let birthdayGreeting: string | null = null;
    for (const child of children) {
      const [, bMonth, bDay] = child.birthday.split('-').map(Number);
      if (bMonth === todayMonth && bDay === todayDay) {
        const age = getAge(child.birthday);
        birthdayGreeting = `Happy birthday, ${child.name}!`;
        break;
      }
    }

    // Check for app anniversary override
    let anniversaryGreeting: string | null = null;
    if (profile?.created_at) {
      const created = new Date(profile.created_at);
      if (
        created.getMonth() + 1 === todayMonth &&
        created.getDate() === todayDay &&
        created.getFullYear() < today.getFullYear()
      ) {
        const years = today.getFullYear() - created.getFullYear();
        anniversaryGreeting = `${years} ${years === 1 ? 'year' : 'years'} of Forever Fireflies!`;
      }
    }

    // Priority: birthday > anniversary > random
    greetingRef.current =
      birthdayGreeting ??
      anniversaryGreeting ??
      pickRandom(GREETINGS[getTimeSlot()]);
  }

  // ─── Data fetch (fallback if stores empty) ─────────────
  useEffect(() => {
    if (children.length > 0 || !familyId) return;

    let cancelled = false;
    setIsLoading(true);

    const fetchData = async () => {
      try {
        const [childRows, entryRows] = await Promise.all([
          childrenService.getChildren(),
          entriesService.getTimeline(familyId),
        ]);
        if (cancelled) return;
        setChildren(childRows.map(mapSupabaseChild));
        setEntries(entryRows.map(mapSupabaseEntry));
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Could not load data');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [familyId, children.length, retryCount]);

  useEffect(() => {
    let cancelled = false;

    const loadPhotoUrls = async () => {
      if (children.length === 0) {
        setChildPhotoUrls({});
        return;
      }

      const pairs = await Promise.all(
        children.map(async (child) => {
          if (!child.photoPath) return [child.id, undefined] as const;
          try {
            const url = await storageService.getChildPhotoUrl(child.photoPath);
            return [child.id, url] as const;
          } catch {
            return [child.id, undefined] as const;
          }
        }),
      );

      if (cancelled) return;
      setChildPhotoUrls(Object.fromEntries(pairs));
    };

    loadPhotoUrls();
    return () => { cancelled = true; };
  }, [children]);

  // Active (non-deleted) entries
  const activeEntries = useMemo(
    () => entries.filter((e) => !e.isDeleted),
    [entries],
  );

  // ─── Loading state ──────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.screen}>
        <TopBar
          rightIcons={[
            { icon: 'settings-outline', onPress: () => router.push('/(main)/settings') },
          ]}
        />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  // ─── Error state ────────────────────────────────────────
  if (loadError) {
    return (
      <View style={styles.screen}>
        <TopBar
          rightIcons={[
            { icon: 'settings-outline', onPress: () => router.push('/(main)/settings') },
          ]}
        />
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorHeading}>Couldn't load data</Text>
          <Text style={styles.errorBody}>{loadError}</Text>
          <Pressable
            onPress={() => { setLoadError(null); setRetryCount((c) => c + 1); }}
            style={({ pressed }) => [styles.retryButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {/* Top bar — greeting as title, gear icon on right */}
      <TopBar
        title={greetingRef.current ?? ''}
        titleStyle="greeting"
        rightIcons={[
          { icon: 'settings-outline', onPress: () => router.push('/(main)/settings') },
        ]}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: spacing(8) + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Subscribe banner for lapsed users */}
        {!hasAccess && (
          <Pressable
            onPress={() => setShowPaywall(true)}
            style={({ pressed }) => [styles.subscribeBanner, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="sparkles" size={18} color={colors.accent} />
            <Text style={styles.subscribeText}>Subscribe to keep recording</Text>
          </Pressable>
        )}

        {/* 1. Branding Banner */}
        <BrandingBanner memoryCount={activeEntries.length} />

        {/* Notices (permission mismatches, etc.) */}
        <NoticesBanner notices={notices} />

        {/* 2. Your Family */}
        <View style={styles.section}>
          <FamilySection
            children={children}
            photoUrls={childPhotoUrls}
            onChildPress={(id) => { setModalChildId(id); setModalVisible(true); }}
          />
        </View>

        {/* 3. On This Day */}
        <View style={styles.section}>
          <OnThisDaySection entries={activeEntries} children={children} />
        </View>

        {/* 4. Today's Prompt */}
        <View style={styles.section}>
          <TodaysPromptCard profileId={userId} children={children} />
        </View>

        {/* 5. This Week (Streaks) */}
        <View style={styles.section}>
          <WeekStreaks entries={activeEntries} />
        </View>

        {/* 6. Coming Up (Birthday) */}
        <View style={styles.section}>
          <ComingUpSection children={children} />
        </View>
      </ScrollView>

      {/* Child modal */}
      <ChildModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        childId={modalChildId}
        children={children}
        entries={activeEntries}
        photoUrls={childPhotoUrls}
      />

      {/* Paywall for lapsed users */}
      <PostTrialPaywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(8),
  },
  errorHeading: {
    ...typography.sectionHeading,
    color: colors.text,
  },
  errorBody: {
    ...typography.formLabel,
    color: colors.textSoft,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: spacing(2),
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(6),
    backgroundColor: colors.accent,
    borderRadius: radii.md,
  },
  retryText: {
    ...typography.buttonLabel,
    color: colors.card,
  },
  scroll: {
    gap: 0,
  },
  section: {
    marginTop: spacing(6),
  },
  // ─── Subscribe Banner ──────────────────
  subscribeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    backgroundColor: colors.accentSoft,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(6),
    borderRadius: radii.lg,
    marginHorizontal: spacing(4),
    marginBottom: spacing(4),
    minHeight: minTouchTarget,
    ...shadows.sm,
  },
  subscribeText: {
    ...typography.formLabel,
    color: colors.accent,
  },
});
