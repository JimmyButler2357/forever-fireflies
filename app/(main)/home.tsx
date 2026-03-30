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
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
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
  minTouchTarget,
} from '@/constants/theme';
import { useChildrenStore, mapSupabaseChild, type Child } from '@/stores/childrenStore';
import { useEntriesStore, mapSupabaseEntry } from '@/stores/entriesStore';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { childrenService } from '@/services/children.service';
import { entriesService } from '@/services/entries.service';
import { useSearchFilter, collectLocations, getAvailableTags } from '@/hooks/useSearchFilter';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { getAge } from '@/lib/dateUtils';
import { buildChildMap, entryToCard, draftToCard, getFirstEntryBadges } from '@/lib/entryHelpers';
import { useDraftStore } from '@/stores/draftStore';
import { useDraftSync } from '@/hooks/useDraftSync';
import DraftBanner from '@/components/DraftBanner';
import TopBar from '@/components/TopBar';
import ChildTab from '@/components/ChildTab';
import EntryCard from '@/components/EntryCard';
import MicButton from '@/components/MicButton';
import DropdownMenu from '@/components/DropdownMenu';
import SearchBar from '@/components/SearchBar';
import FilterChips from '@/components/FilterChips';
import DateRangePicker from '@/components/DateRangePicker';
import PostTrialPaywall from '@/components/PostTrialPaywall';
import { useSubscription } from '@/hooks/useSubscription';
import { capture } from '@/lib/posthog';

// ─── Animation duration ──────────────────────────────────

const ANIM_DURATION = 250;

// ─── Home Screen ──────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const children = useChildrenStore((s) => s.children);
  const setChildren = useChildrenStore((s) => s.setChildren);
  const entries = useEntriesStore((s) => s.entries);
  const setEntries = useEntriesStore((s) => s.setEntries);
  const activeFilter = useUIStore((s) => s.activeChildFilter);
  const setFilter = useUIStore((s) => s.setActiveChildFilter);
  const familyId = useAuthStore((s) => s.familyId);
  const userId = useAuthStore((s) => s.session?.user?.id);
  const signOut = useAuthStore((s) => s.signOut);
  const clearChildren = useChildrenStore((s) => s.clearChildren);
  const clearEntries = useEntriesStore((s) => s.clearEntries);

  // Dropdown menu state
  const [menuVisible, setMenuVisible] = useState(false);

  // Subscription state — controls what features are available.
  // When hasAccess is false (trial expired, no subscription), we hide
  // the mic button, write link, and Firefly Jar icon.
  const { hasAccess } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

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
      // 200 is enough for search bar + filter chips + date picker when open
      searchAreaHeight.value = withTiming(200, { duration });
      setTimeout(() => searchBarRef.current?.focus(), reduceMotion ? 50 : 280);
    }
  }, [isSearchActive, reduceMotion]);

  // ─── Fetch real data from Supabase on mount ──────────────
  //
  // This replaces the old seed data logic. On mount, we:
  // 1. Fetch children from the children table
  // 2. Fetch timeline entries (newest first, with joined children + tags)
  // 3. Map the snake_case rows to our camelCase UI shapes
  // 4. Update the local stores
  //
  // Think of it like opening a filing cabinet when you arrive
  // at work — you pull out what you need and put copies on
  // your desk (local store) for quick reference.

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
        // Fetch children and entries in parallel — they don't
        // depend on each other, so running them at the same time
        // is faster than running one after the other.
        const [childRows, entryRows] = await Promise.all([
          childrenService.getChildren(),
          entriesService.getTimeline(familyId),
        ]);

        if (cancelled) return;

        // Map server rows to UI shapes and update local stores
        setChildren(childRows.map(mapSupabaseChild));
        setEntries(entryRows.map(mapSupabaseEntry));
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Could not load data';
        setLoadError(message);
        console.warn('Home data fetch failed:', error);
      } finally {
        if (!cancelled) setIsLoadingData(false);
      }
    };

    fetchData();

    // Cleanup — if the component unmounts before the fetch
    // finishes (e.g. user navigates away fast), we set a flag
    // so we don't try to update state on an unmounted component.
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

  // Step 2: Apply search + tag + date filters on top
  const displayedEntries = useMemo(() => {
    if (!isSearchActive) return childFiltered;
    return searchFilter.filterEntries(childFiltered);
  }, [childFiltered, isSearchActive, searchFilter.filterEntries, searchFilter.query, searchFilter.selectedTags, searchFilter.selectedLocations, searchFilter.dateRangeIndex]);

  // Tags that would still produce results if selected (progressive disclosure)
  const availableTags = useMemo(
    () => getAvailableTags(displayedEntries, searchFilter.selectedTags),
    [displayedEntries, searchFilter.selectedTags],
  );
  // Selected tags first (so user can deselect), then available ones
  const visibleTags = useMemo(
    () => [...searchFilter.selectedTags, ...availableTags],
    [searchFilter.selectedTags, availableTags],
  );
  const allLocations = useMemo(() => collectLocations(entries), [entries]);

  const isMultiChild = children.length >= 2;
  const isSingleChild = children.length === 1;
  const isFirstEntry = activeEntries.length === 1;

  // ─── Menu Handlers ──────────────────────────────────────

  const handleMenuNavigate = useCallback((screen: string) => {
    router.push(`/(main)/${screen}` as any);
  }, [router]);

  // Sign out — same logic as settings.tsx used to have.
  // Checks for pending drafts first and warns the user.
  const handleSignOut = useCallback(async () => {
    const pendingDrafts = userId
      ? useDraftStore.getState().getDraftsForUser(userId)
      : [];

    const doSignOut = async () => {
      try {
        await signOut();
        clearChildren();
        clearEntries();
        router.replace('/(onboarding)');
      } catch (error) {
        console.warn('Sign out error:', error);
      }
    };

    if (pendingDrafts.length > 0) {
      Alert.alert(
        'Unsent memories',
        `You have ${pendingDrafts.length} ${pendingDrafts.length === 1 ? 'memory' : 'memories'} waiting to sync. They'll be here when you sign back in.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign Out', style: 'destructive', onPress: doSignOut },
        ],
      );
    } else {
      await doSignOut();
    }
  }, [userId, signOut, clearChildren, clearEntries, router]);

  // Build child lookup for fast access
  const childMap = useMemo(() => buildChildMap(children), [children]);

  // Identify each child's earliest entry for "first memory" badges
  const firstMemoryBadges = useMemo(
    () => getFirstEntryBadges(activeEntries, childMap),
    [activeEntries, childMap],
  );

  const childColor = childColors[children[0]?.colorIndex ?? 0]?.hex ?? childColors[0].hex;

  // ─── Loading state ──────────────────────────────────────
  // Show a spinner while we're fetching data for the first time.
  // This prevents showing an empty screen briefly before data loads.

  if (isLoadingData) {
    return (
      <View style={styles.container}>
        <TopBar title="Forever Fireflies" titleStyle="serif" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  // ─── Error state ────────────────────────────────────────
  // If the data fetch failed, show an error with a retry button.

  if (loadError) {
    return (
      <View style={styles.container}>
        <TopBar title="Forever Fireflies" titleStyle="serif" />
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
      {/* Top bar */}
      <TopBar
        title="Forever Fireflies"
        titleStyle="serif"
        rightIcons={[
          {
            icon: (isSearchActive ? 'close-outline' : 'search-outline') as keyof typeof Ionicons.glyphMap,
            onPress: toggleSearchMode,
          },
          // Only show Firefly Jar heart when user has access (trial active or subscribed).
          // When expired, we hide it so lapsed users aren't tempted by a locked screen.
          ...(hasAccess
            ? [{ icon: 'heart-outline' as keyof typeof Ionicons.glyphMap, onPress: () => router.push('/(main)/firefly-jar') }]
            : []),
          { icon: 'menu-outline' as const, onPress: () => setMenuVisible(true) },
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
        <FilterChips
          allTags={visibleTags}
          selectedTags={searchFilter.selectedTags}
          onToggleTag={searchFilter.toggleTag}
          allLocations={allLocations}
          selectedLocations={searchFilter.selectedLocations}
          onToggleLocation={searchFilter.toggleLocation}
          dateRangeIndex={searchFilter.dateRangeIndex}
          onToggleDatePicker={() => searchFilter.setShowDatePicker(!searchFilter.showDatePicker)}
          hasActiveFilters={searchFilter.hasActiveFilters}
          onClearAll={searchFilter.clearAll}
        />
        {searchFilter.showDatePicker && (
          <DateRangePicker
            activeIndex={searchFilter.dateRangeIndex}
            onSelect={searchFilter.toggleDateRange}
          />
        )}
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

      {/* Child tabs — multi-child only */}
      {isMultiChild && (
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

      {/* Single child info pill — pill has dot + name; age + count sit outside */}
      {isSingleChild && (
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
          // Show draft cards above synced entries (only when not searching)
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
                Try different keywords or filters.
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
        <View style={[styles.resultCount, { bottom: insets.bottom + spacing(6) + 120 }]}>
          <Text style={styles.resultCountText}>
            {displayedEntries.length} {displayedEntries.length === 1 ? 'memory' : 'memories'} found
          </Text>
        </View>
      )}

      {/* Floating bottom area — gradient fade + mic + write link */}
      <View style={styles.bottomWrapper} pointerEvents="box-none">
        <LinearGradient
          colors={['transparent', 'rgba(250,248,245,0.5)', 'rgba(250,248,245,0.88)']}
          locations={[0, 0.55, 1]}
          style={styles.bottomFade}
          pointerEvents="none"
        />
        {hasAccess ? (
          // Full access — show mic button + write link
          <View style={[styles.bottomArea, { paddingBottom: insets.bottom + spacing(5) }]}>
            <MicButton
              size="home"
              onPress={() => router.push('/(main)/recording')}
            />
            <Pressable
              onPress={() => router.push({ pathname: '/(main)/entry-detail', params: { transcript: '' } })}
              style={styles.writeLink}
            >
              <Ionicons name="pencil-outline" size={12} color={colors.textSoft} />
              <Text style={styles.writeLinkText}>or write instead</Text>
            </Pressable>
          </View>
        ) : (
          // Lapsed — show subscribe banner instead of mic button.
          // The banner opens the post-trial paywall modal.
          <View style={[styles.bottomArea, { paddingBottom: insets.bottom + spacing(5) }]}>
            <Pressable
              onPress={() => setShowPaywall(true)}
              style={({ pressed }) => [styles.subscribeBanner, pressed && { opacity: 0.9 }]}
            >
              <Ionicons name="sparkles" size={18} color={colors.accent} />
              <Text style={styles.subscribeBannerText}>Subscribe to keep recording</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Dropdown menu — anchored below the menu icon */}
      <DropdownMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        onNavigate={handleMenuNavigate}
        onSignOut={handleSignOut}
      />

      {/* Post-trial paywall — shown when user taps the subscribe banner */}
      <PostTrialPaywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
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
    paddingBottom: 140, // room for bottom floating area
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
  // ─── Bottom Area ───────────────────
  bottomWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomFade: {
    height: 70,
  },
  bottomArea: {
    backgroundColor: 'rgba(250, 248, 245, 0.88)',
    alignItems: 'center',
    paddingTop: spacing(1),
    gap: spacing(2),
  },
  writeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  writeLinkText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSoft,
  },
  // ─── Subscribe Banner (lapsed state) ──────
  subscribeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(2),
    backgroundColor: colors.accentSoft,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(6),
    borderRadius: radii.lg,
    minHeight: minTouchTarget,
    ...shadows.sm,
  },
  subscribeBannerText: {
    ...typography.formLabel,
    color: colors.accent,
  },
});
