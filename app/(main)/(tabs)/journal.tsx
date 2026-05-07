import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ScrollView,
  Pressable,
  Keyboard,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  childColors,
  childColorWithOpacity,
  hitSlop,
} from '@/constants/theme';
import { useChildrenStore, mapSupabaseChild, type Child } from '@/stores/childrenStore';
import { useEntriesStore, mapSupabaseEntry } from '@/stores/entriesStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { childrenService } from '@/services/children.service';
import { entriesService } from '@/services/entries.service';
import {
  useSearchFilter,
  collectLocations,
  collectYears,
  getAvailableTags,
} from '@/hooks/useSearchFilter';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { getAge } from '@/lib/dateUtils';
import { buildChildMap, entryToCard, draftToCard, getFirstEntryBadges } from '@/lib/entryHelpers';
import { useDraftStore } from '@/stores/draftStore';
import { useDraftSync } from '@/hooks/useDraftSync';
import DraftBanner from '@/components/DraftBanner';
import TopBar from '@/components/TopBar';
import ChildTab from '@/components/ChildTab';
import EntryCard from '@/components/EntryCard';
import SearchBar from '@/components/SearchBar';
import FilterPanel from '@/components/FilterPanel';
import { capture } from '@/lib/posthog';

// ─── Animation duration ──────────────────────────────────

const ANIM_DURATION = 250;

// ─── Journal Tab ─────────────────────────────────────────
//
// The entry timeline — browse, search, and filter all your
// memories. This was the original home screen, renamed and
// trimmed down. The floating mic button and menu moved to
// the tab bar and Home tab respectively.

export default function JournalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const params = useLocalSearchParams<{ openSearch?: string }>();
  const autoOpenedRef = useRef(false);
  const children = useChildrenStore((s) => s.children);
  const setChildren = useChildrenStore((s) => s.setChildren);
  const entries = useEntriesStore((s) => s.entries);
  const setEntries = useEntriesStore((s) => s.setEntries);
  const activeFilter = useUIStore((s) => s.activeChildFilter);
  const setFilter = useUIStore((s) => s.setActiveChildFilter);
  const familyId = useAuthStore((s) => s.familyId);
  const userId = useAuthStore((s) => s.session?.user?.id);

  // Track screen view for analytics
  useEffect(() => { capture('screen_viewed', { screen: 'Journal' }); }, []);

  // Draft sync — watches connectivity and auto-syncs offline drafts
  const { retryDraft } = useDraftSync();

  // Get drafts for the current user
  const allDrafts = useDraftStore((s) => s.drafts);
  const userDrafts = useMemo(
    () => (userId ? allDrafts.filter((d) => d.userId === userId) : []),
    [allDrafts, userId],
  );

  // Loading & error state for the initial fetch
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Search state
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const searchBarRef = useRef<TextInput>(null);
  const searchFilter = useSearchFilter();

  // Animated expand/collapse for the search area
  const searchAreaOpacity = useSharedValue(0);
  const searchAreaHeight = useSharedValue(0);

  const searchAreaStyle = useAnimatedStyle(() => ({
    opacity: searchAreaOpacity.value,
    maxHeight: searchAreaHeight.value,
    overflow: 'hidden' as const,
  }));

  const toggleSearchMode = useCallback(() => {
    if (isSearchActive) {
      // Collapse search
      const duration = reduceMotion ? 0 : ANIM_DURATION;
      searchAreaOpacity.value = withTiming(0, { duration });
      searchAreaHeight.value = withTiming(0, { duration });
      Keyboard.dismiss();
      searchFilter.clearAll();
      setIsSearchActive(false);
    } else {
      // Expand search
      setIsSearchActive(true);
      capture('search_opened');
      const duration = reduceMotion ? 0 : ANIM_DURATION;
      searchAreaOpacity.value = withTiming(1, { duration });
      // 720 leaves headroom for the four faceted rows when fully expanded.
      // The actual content sets its own height; maxHeight just clamps it.
      searchAreaHeight.value = withTiming(720, { duration });
      setTimeout(() => searchBarRef.current?.focus(), reduceMotion ? 50 : 280);
    }
  }, [isSearchActive, reduceMotion]);

  // Auto-open search when arriving from Home's search button.
  // The ref guard ensures this fires once per navigation, not on every re-render.
  useEffect(() => {
    if (params.openSearch === '1' && !autoOpenedRef.current && !isSearchActive) {
      autoOpenedRef.current = true;
      toggleSearchMode();
    }
  }, [params.openSearch, isSearchActive, toggleSearchMode]);

  // ─── Fetch real data from Supabase on mount ──────────────

  useEffect(() => {
    if (!familyId) {
      setIsLoadingData(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setIsLoadingData(true);
      setLoadError(null);
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
        console.warn('Journal data fetch failed:', error);
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };

    fetchData();

    return () => { cancelled = true; };
  }, [familyId, retryCount]);

  // Active (non-deleted) entries, reverse chronological
  const activeEntries = useMemo(
    () => entries.filter((e) => !e.isDeleted),
    [entries],
  );

  // Step 1: Filter by child tab
  const childFiltered = useMemo(() => {
    if (!activeFilter) return activeEntries;
    return activeEntries.filter((e) => e.childIds.includes(activeFilter));
  }, [activeEntries, activeFilter]);

  // Build child lookup for fast access
  const childMap = useMemo(() => buildChildMap(children), [children]);

  // The child whose birthday powers age filtering — defined when one child
  // is in scope (single-child family or active child tab).
  const scopeChild = useMemo<Child | undefined>(() => {
    if (activeFilter) return childMap[activeFilter];
    if (children.length === 1) return children[0];
    return undefined;
  }, [activeFilter, children, childMap]);

  // Step 2: Apply search + tag + date filters on top
  const displayedEntries = useMemo(() => {
    if (!isSearchActive) return childFiltered;
    return searchFilter.filterEntries(childFiltered, scopeChild);
  }, [childFiltered, isSearchActive, searchFilter.filterEntries, scopeChild]);

  // Tags that would still produce results if selected (progressive disclosure)
  const availableTags = useMemo(
    () => getAvailableTags(displayedEntries, searchFilter.selectedTags),
    [displayedEntries, searchFilter.selectedTags],
  );
  const visibleTags = useMemo(
    () => [...searchFilter.selectedTags, ...availableTags],
    [searchFilter.selectedTags, availableTags],
  );
  const allLocations = useMemo(() => collectLocations(entries), [entries]);
  const availableYears = useMemo(() => collectYears(activeEntries), [activeEntries]);

  const isSingleChild = children.length === 1;
  const isFirstEntry = activeEntries.length === 1;

  // Identify each child's earliest entry for "first memory" badges
  const firstMemoryBadges = useMemo(
    () => getFirstEntryBadges(activeEntries, childMap),
    [activeEntries, childMap],
  );

  const childColor = childColors[children[0]?.colorIndex ?? 0]?.hex ?? childColors[0].hex;

  // ─── Loading state ──────────────────────────────────────

  if (isLoadingData) {
    return (
      <View style={styles.container}>
        <TopBar title="Journal" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  // ─── Error state ────────────────────────────────────────

  if (loadError) {
    return (
      <View style={styles.container}>
        <TopBar title="Journal" />
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyHeading}>Couldn't load memories</Text>
          <Text style={styles.emptyBody}>{loadError}</Text>
          <Pressable
            onPress={() => {
              setLoadError(null);
              setRetryCount((c) => c + 1);
            }}
            style={({ pressed }) => [
              styles.retryButton,
              pressed && { opacity: 0.8 },
            ]}
          >
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top bar — "Journal" with search toggle */}
      <TopBar
        title="Journal"
        rightIcons={[
          {
            icon: (isSearchActive ? 'close-outline' : 'search-outline') as keyof typeof Ionicons.glyphMap,
            onPress: toggleSearchMode,
          },
        ]}
      />

      {/* Collapsible search area */}
      <Animated.View style={searchAreaStyle}>
        <SearchBar
          ref={searchBarRef}
          value={searchFilter.query}
          onChangeText={searchFilter.setQuery}
          onClear={() => searchFilter.setQuery('')}
        />
        <FilterPanel
          children={children}
          activeChildId={activeFilter}
          onSelectChild={setFilter}
          visibleTags={visibleTags}
          selectedTags={searchFilter.selectedTags}
          onToggleTag={searchFilter.toggleTag}
          allLocations={allLocations}
          selectedLocations={searchFilter.selectedLocations}
          onToggleLocation={searchFilter.toggleLocation}
          availableYears={availableYears}
          scopeChild={scopeChild}
          dateFilter={searchFilter.dateFilter}
          onSetDateFilter={searchFilter.setDateFilter}
          hasActiveFilters={searchFilter.hasActiveFilters}
          onClearAll={searchFilter.clearAll}
        />
      </Animated.View>

      {/* First-entry celebration banner */}
      {isFirstEntry && !bannerDismissed && (
        <View style={styles.banner}>
          <Pressable
            onPress={() => setBannerDismissed(true)}
            hitSlop={hitSlop.icon}
            style={({ pressed }) => [
              styles.bannerClose,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="close" size={16} color={colors.textMuted} />
          </Pressable>
          <Text style={styles.bannerEmoji}>✨</Text>
          <Text style={styles.bannerTitle}>Your first memory is saved</Text>
          <Text style={styles.bannerBody}>
            This is where all your memories will live. Record another one anytime.
          </Text>
        </View>
      )}

      {/* Multi-child tabs now live inside FilterPanel (Child row).
          When search is closed, fall back to the inline child-tab row so
          users can still filter without opening search. */}
      {!isSearchActive && children.length >= 2 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabRow}
        >
          <ChildTab
            label="All"
            color={colors.general}
            active={activeFilter === null}
            onPress={() => setFilter(null)}
            showDot={false}
          />
          {children.map((child) => (
            <ChildTab
              key={child.id}
              label={child.name}
              color={childColors[child.colorIndex]?.hex ?? childColors[0].hex}
              active={activeFilter === child.id}
              onPress={() => setFilter(child.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Single child info pill */}
      {isSingleChild && !isSearchActive && (
        <View style={styles.singleChildRow}>
          <View
            style={[
              styles.singleChildPill,
              {
                backgroundColor: childColorWithOpacity(childColor, 0.12),
                borderColor: childColor,
                shadowColor: childColor,
              },
            ]}
          >
            <View
              style={[
                styles.singleChildDot,
                { backgroundColor: childColor },
              ]}
            />
            <Text
              style={[
                styles.singleChildName,
                { color: childColor },
              ]}
            >
              {children[0].name}
            </Text>
          </View>
          <Text style={styles.singleChildAge}>
            {getAge(children[0].birthday)}
          </Text>
          <Text style={styles.singleChildSep}>{'\u00B7'}</Text>
          <Text style={styles.singleChildCount}>
            {activeEntries.length} {activeEntries.length === 1 ? 'memory' : 'memories'}
          </Text>
        </View>
      )}

      {/* Draft banner — shows when offline drafts exist */}
      {userDrafts.length > 0 && !isSearchActive && (
        <DraftBanner drafts={userDrafts} />
      )}

      {/* Entry list — drafts prepended above synced entries */}
      <FlatList
        data={displayedEntries}
        keyExtractor={(item) => item.id}
        style={styles.listContainer}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          !isSearchActive && userDrafts.length > 0 ? (
            <View style={styles.draftList}>
              {userDrafts.map((draft, index) => (
                <EntryCard
                  key={draft.localId}
                  entry={draftToCard(draft)}
                  index={index}
                  syncStatus={draft.status}
                  onPress={() => {
                    if (draft.status === 'failed') {
                      retryDraft(draft.localId);
                    } else {
                      Alert.alert(
                        'Not synced yet',
                        'This memory will sync when you\'re back online.',
                      );
                    }
                  }}
                  showTags={false}
                />
              ))}
            </View>
          ) : null
        }
        renderItem={({ item, index }) => (
          <EntryCard
            entry={entryToCard(item, childMap, 'short', firstMemoryBadges)}
            index={index}
            onPress={() => router.push({ pathname: '/(main)/entry-detail', params: { entryId: item.id } })}
            showTags={isSearchActive}
            highlightQuery={isSearchActive ? searchFilter.query.trim() : undefined}
            glowing={isFirstEntry}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          isSearchActive ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyHeading}>No memories found</Text>
              <Text style={styles.emptyBody}>
                {searchFilter.dateFilter?.kind === 'year'
                  ? `Nothing from ${searchFilter.dateFilter.year} yet.`
                  : searchFilter.dateFilter?.kind === 'ageAt' && scopeChild
                  ? `No memories from when ${scopeChild.name} was ${searchFilter.dateFilter.year}. Try a wider range.`
                  : searchFilter.dateFilter?.kind === 'ageRange' && scopeChild
                  ? `No memories from that age yet for ${scopeChild.name}. Try a wider range.`
                  : 'Try different keywords or filters.'}
              </Text>
            </View>
          ) : userDrafts.length > 0 ? null : (
            <View style={styles.empty}>
              <Ionicons name="book-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyHeading}>No memories yet</Text>
              <Text style={styles.emptyBody}>
                Tap the mic button to record your first memory.
              </Text>
            </View>
          )
        }
      />

      {/* Result count pill (when searching with results) */}
      {isSearchActive && searchFilter.hasActiveFilters && displayedEntries.length > 0 && (
        <View style={[styles.resultCount, { bottom: insets.bottom + spacing(6) }]}>
          <Text style={styles.resultCountText}>
            {displayedEntries.length} {displayedEntries.length === 1 ? 'memory' : 'memories'} found
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // ─── Loading / Error ─────────────
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(3),
    paddingHorizontal: spacing(8),
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
  // ─── Banner ────────────────────────
  banner: {
    marginHorizontal: spacing(5),
    marginBottom: spacing(4),
    padding: spacing(4),
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: childColorWithOpacity(colors.accent, 0.15),
    alignItems: 'center',
  },
  bannerClose: {
    position: 'absolute',
    top: spacing(2),
    right: spacing(2),
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerEmoji: {
    fontSize: 24,
    marginBottom: spacing(2),
  },
  bannerTitle: {
    ...typography.formLabel,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing(1),
  },
  bannerBody: {
    ...typography.caption,
    color: colors.textSoft,
    textAlign: 'center',
  },
  // ─── Child Tabs ────────────────────
  tabScroll: {
    flexGrow: 0,
  },
  tabRow: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    gap: spacing(2),
    alignItems: 'center',
  },
  // ─── Single Child Pill ─────────────
  singleChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    gap: spacing(2),
  },
  singleChildPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radii.pill,
    borderWidth: 2,
    gap: spacing(2),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  singleChildDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  singleChildName: {
    ...typography.pillLabel,
  },
  singleChildAge: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  singleChildSep: {
    fontSize: 12,
    color: colors.textMuted,
  },
  singleChildCount: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  // ─── Draft List ────────────────────
  draftList: {
    gap: spacing(3),
    marginBottom: spacing(3),
  },
  // ─── Entry List ────────────────────
  listContainer: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(6), // Reduced — tab bar provides the bottom spacing now
  },
  // ─── Empty State ───────────────────
  empty: {
    alignItems: 'center',
    paddingTop: spacing(16),
    gap: spacing(3),
  },
  emptyHeading: {
    ...typography.sectionHeading,
    color: colors.text,
  },
  emptyBody: {
    ...typography.formLabel,
    color: colors.textSoft,
    textAlign: 'center',
  },
  // ─── Result Count ──────────────────
  resultCount: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: colors.text,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radii.full,
    ...shadows.md,
  },
  resultCountText: {
    ...typography.caption,
    color: colors.card,
    fontWeight: '600',
  },
});
