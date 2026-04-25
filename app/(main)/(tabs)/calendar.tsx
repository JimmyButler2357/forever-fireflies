import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, fonts } from '@/constants/theme';
import { useChildrenStore, mapSupabaseChild } from '@/stores/childrenStore';
import { useEntriesStore, mapSupabaseEntry } from '@/stores/entriesStore';
import { useAuthStore } from '@/stores/authStore';
import { childrenService } from '@/services/children.service';
import { entriesService } from '@/services/entries.service';
import { buildChildMap } from '@/lib/entryHelpers';
import TopBar from '@/components/TopBar';
import MonthGrid from '@/components/calendar/MonthGrid';
import ChildLegend from '@/components/calendar/ChildLegend';
import DayBottomSheet from '@/components/calendar/DayBottomSheet';
import {
  groupEntriesByDate,
  getEarliestEntryMonth,
} from '@/components/calendar/calendarUtils';
import { capture } from '@/lib/posthog';
import type { Entry } from '@/stores/entriesStore';

/**
 * Calendar tab — a month-grid view of all entries.
 *
 * Each day cell shows child-colored dots for entries
 * on that date. Tapping a day opens a bottom sheet
 * with that day's entries, and tapping an entry
 * navigates to entry-detail.
 *
 * Think of it like a paper calendar where you can see
 * at a glance which days had special moments.
 */

export default function CalendarTab() {
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const setChildren = useChildrenStore((s) => s.setChildren);
  const entries = useEntriesStore((s) => s.entries);
  const setEntries = useEntriesStore((s) => s.setEntries);
  const familyId = useAuthStore((s) => s.familyId);

  // Current month being displayed
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());

  // Bottom sheet state — which day's entries are showing
  const [selectedDay, setSelectedDay] = useState<{
    date: string;
    entries: Entry[];
  } | null>(null);

  // Loading / error (fallback if stores are empty)
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    capture('screen_viewed', { screen: 'Calendar' });
  }, []);

  // ─── Data fetch (if stores empty) ────────────────────────
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
        setLoadError('Check your connection and try again.');
        console.warn('Calendar data fetch failed:', error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [familyId, children.length, retryCount]);

  // ─── Derived data ────────────────────────────────────────
  const activeEntries = useMemo(
    () => entries.filter((e) => !e.isDeleted),
    [entries],
  );

  const childMap = useMemo(
    () => buildChildMap(children),
    [children],
  );

  const entriesByDate = useMemo(
    () => groupEntriesByDate(activeEntries),
    [activeEntries],
  );

  const earliestMonth = useMemo(
    () => getEarliestEntryMonth(activeEntries),
    [activeEntries],
  );

  // Navigation bounds
  const canGoBack = useMemo(() => {
    if (!earliestMonth) return false;
    if (currentYear > earliestMonth.year) return true;
    if (currentYear === earliestMonth.year && currentMonth > earliestMonth.month)
      return true;
    return false;
  }, [currentYear, currentMonth, earliestMonth]);

  const canGoForward = useMemo(() => {
    const today = new Date();
    if (currentYear < today.getFullYear()) return true;
    if (
      currentYear === today.getFullYear() &&
      currentMonth < today.getMonth()
    )
      return true;
    return false;
  }, [currentYear, currentMonth]);

  // ─── Handlers ────────────────────────────────────────────
  const handleMonthChange = (year: number, month: number) => {
    setCurrentYear(year);
    setCurrentMonth(month);
  };

  const handleDayPress = (date: string, dayEntries: Entry[]) => {
    setSelectedDay({ date, entries: dayEntries });
  };

  const handleSheetClose = () => {
    setSelectedDay(null);
  };

  // ─── Loading state ───────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.screen}>
        <TopBar title="Calendar" />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  // ─── Error state ─────────────────────────────────────────
  if (loadError) {
    return (
      <View style={styles.screen}>
        <TopBar title="Calendar" />
        <View style={styles.center}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Text
            style={styles.retryLink}
            onPress={() => {
              setLoadError(null);
              setRetryCount((c) => c + 1);
            }}
          >
            Tap to retry
          </Text>
        </View>
      </View>
    );
  }

  // ─── Empty state (brand new user) ────────────────────────
  const hasAnyEntries = activeEntries.length > 0;

  return (
    <View style={styles.screen}>
      <TopBar title="Calendar" />

      <View style={[styles.content, { paddingBottom: spacing(8) + insets.bottom }]}>
        <MonthGrid
          year={currentYear}
          month={currentMonth}
          entriesByDate={entriesByDate}
          childMap={childMap}
          onDayPress={handleDayPress}
          onMonthChange={handleMonthChange}
          canGoBack={canGoBack}
          canGoForward={canGoForward}
        />

        <ChildLegend children={children} />

        {!hasAnyEntries && (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              Your calendar will fill with color as you record memories.
            </Text>
          </View>
        )}
      </View>

      <DayBottomSheet
        visible={selectedDay !== null}
        onClose={handleSheetClose}
        date={selectedDay?.date ?? ''}
        entries={selectedDay?.entries ?? []}
        childMap={childMap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing(8),
  },
  errorText: {
    fontSize: 14,
    color: colors.textSoft,
    textAlign: 'center',
    marginBottom: spacing(3),
  },
  retryLink: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  emptyWrap: {
    paddingHorizontal: spacing(8),
    paddingTop: spacing(8),
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: fonts.serif,
    fontStyle: 'italic',
    fontSize: 14,
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 22,
  },
});
