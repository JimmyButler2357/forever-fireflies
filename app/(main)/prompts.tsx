import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  childColors,
  typography,
  spacing,
  radii,
  shadows,
  minTouchTarget,
} from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useChildrenStore } from '@/stores/childrenStore';
import { promptsService } from '@/services/prompts.service';
import { ageInMonths } from '@/lib/dateUtils';
import TopBar from '@/components/TopBar';
import ChildTab from '@/components/ChildTab';
import { useSubscription } from '@/hooks/useSubscription';
import { capture } from '@/lib/posthog';
import { useReduceMotion } from '@/hooks/useReduceMotion';

// ─── Types ──────────────────────────────────────────────

interface PromptItem {
  id: string;
  text: string;
}

// ─── Theme Definitions ──────────────────────────────────
//
// These map to the `category` column in the prompts table.
// "All" shows every category; the rest filter by theme.
// Think of it like browsing a bookshelf by topic — you can
// see everything or jump to the section you want.

const THEMES = [
  { label: 'All', value: 'all' },
  { label: 'Everyday', value: 'everyday' },
  { label: 'Milestones', value: 'milestones' },
  { label: 'Funny', value: 'funny' },
  { label: 'Feelings', value: 'feelings' },
  { label: 'Firsts', value: 'firsts' },
] as const;

type ThemeValue = (typeof THEMES)[number]['value'];

// ─── Animated Prompt Card ───────────────────────────────
//
// Each card manages its own fade + slide animation refs,
// just like EntryCard does. The `animKey` prop forces a
// fresh mount (and fresh animation) when the data changes
// — e.g. after a shuffle or filter switch.

function PromptCard({
  text,
  index,
  reduceMotion,
  onPress,
}: {
  text: string;
  index: number;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(reduceMotion ? 0 : 16)).current;

  useEffect(() => {
    if (reduceMotion) return;
    const delay = index * 180; // Staggered cascade — 180ms between cards
    // Easing.out(cubic) decelerates gently at the end, like a card
    // settling onto paper rather than snapping into place.
    const easing = Easing.out(Easing.cubic);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        delay,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1500,
        delay,
        easing,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
      >
        <Text style={styles.cardText}>{text}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ─── Prompts Screen ─────────────────────────────────────

export default function PromptsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAuthStore((s) => s.profile);
  const children = useChildrenStore((s) => s.children);
  const { hasAccess } = useSubscription();

  const [allPrompts, setAllPrompts] = useState<PromptItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTheme, setActiveTheme] = useState<ThemeValue>('all');
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const reduceMotion = useReduceMotion();

  // Unified transition state — every prompt-changing interaction
  // (theme pill, child tab, shuffle) runs the same fade-out → swap → fade-in.
  // `transitionLockRef` is a synchronous guard to drop concurrent taps.
  // `isTransitioning` drives UI feedback (disables shuffle button during fade).
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionLockRef = useRef(false);
  const cardsFadeAnim = useRef(new Animated.Value(1)).current;
  const shuffleSpinAnim = useRef(new Animated.Value(0)).current;

  // Cache prompts per filter combo so switching back is instant.
  // Keyed by "theme:childId" — e.g. "funny:abc123" or "all:all".
  const promptCacheRef = useRef(new Map<string, PromptItem[]>());

  // Stale-fetch guard: each fetch increments this counter.
  // When the response arrives, it checks if the counter still
  // matches — if not, a newer fetch was started and this one
  // is discarded. Prevents old responses from overwriting new ones.
  const fetchCounterRef = useRef(0);

  // Track screen view for analytics
  useEffect(() => { capture('screen_viewed', { screen: 'Prompts' }); }, []);

  // If the selected child gets deleted (e.g. from another device),
  // reset to "All" so the screen doesn't break.
  useEffect(() => {
    if (activeChildId !== null && !children.find((c) => c.id === activeChildId)) {
      setActiveChildId(null);
    }
  }, [children, activeChildId]);

  // Fetch prompts whenever filters or children change
  useEffect(() => {
    if (!profile?.id) return;

    const cacheKey = `${activeTheme}:${activeChildId ?? 'all'}`;

    // Check cache first
    const cached = promptCacheRef.current.get(cacheKey);
    if (cached) {
      setAllPrompts(cached);
      setIsLoading(false);
      return;
    }

    const myFetchId = ++fetchCounterRef.current;

    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const category = activeTheme === 'all' ? undefined : activeTheme;
        let prompts;

        if (activeChildId === null) {
          // "All" child tab — show all prompts regardless of age range
          prompts = await promptsService.getNextPrompts(
            profile.id, 12, undefined, category, false,
          );
        } else {
          // Specific child — age-filtered + personalized
          const child = children.find((c) => c.id === activeChildId);
          const childAge = child ? ageInMonths(child.birthday) : undefined;
          prompts = await promptsService.getNextPrompts(
            profile.id, 12, childAge, category, false,
          );
        }

        // Discard if a newer fetch has started
        if (fetchCounterRef.current !== myFetchId) return;

        const items = prompts.map((p) => ({ id: p.id, text: p.text }));
        promptCacheRef.current.set(cacheKey, items);
        setAllPrompts(items);
      } catch (err) {
        if (fetchCounterRef.current !== myFetchId) return;
        const message = err instanceof Error ? err.message : 'Could not load prompts';
        setLoadError(message);
      } finally {
        if (fetchCounterRef.current === myFetchId) setIsLoading(false);
      }
    })();
    // Intentionally omit `children` from deps — the prompt list depends
    // on the selected child's age at fetch time, not the whole children
    // array. Re-fetching when unrelated children change (rehydration,
    // adding another child) would cause spurious transitions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, activeTheme, activeChildId]);

  // Reset shuffle seed when filters change — so you always start
  // at a fresh "page" of the shuffled deck. The transition itself
  // (fade out → swap → fade in) is handled by `runTransition`;
  // this just keeps the seed tidy.
  useEffect(() => {
    setShuffleSeed(0);
  }, [activeTheme, activeChildId]);

  // Substitute {child_name} with the selected child's name,
  // or "your little one" when no child is selected.
  // Done at render time (not fetch time) so renaming a child
  // takes effect instantly — no refetch needed.
  const substituteChildName = useCallback((text: string) => {
    if (activeChildId === null) {
      return text.replace(/\{child_name\}/gi, 'your little one');
    }
    const child = children.find((c) => c.id === activeChildId);
    return text.replace(/\{child_name\}/gi, child?.name ?? 'your child');
  }, [activeChildId, children]);

  // Deterministic shuffle so the same seed always produces
  // the same card order — lets the user "go back" by not shuffling.
  const displayedPrompts = useMemo(() => {
    const shuffled = [...allPrompts];
    let seed = shuffleSeed;
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 11) % 2147483647;
      const j = seed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, Math.min(5, shuffled.length));
  }, [allPrompts, shuffleSeed]);

  // ─── Frozen display snapshot ───────────────────────────
  //
  // Cards render from `snapshot`, not `displayedPrompts` directly.
  // The snapshot holds both the card data AND the display text already
  // substituted with the child's name — this freezes EVERYTHING about
  // what's on screen during a transition.
  //
  // `generation` is part of the same state object so we can update
  // both atomically with ONE setState. Using separate setStates here
  // would cause two renders — the first with new data but old keys
  // (same cards receiving new props → flash of new text at opacity 0),
  // the second with new keys (remount to opacity 0). The atomic swap
  // guarantees cards unmount and new cards mount in the same commit.
  interface Snapshot {
    generation: number;
    cards: Array<{ displayText: string; rawText: string }>;
  }
  const [snapshot, setSnapshot] = useState<Snapshot>({
    generation: 0,
    cards: [],
  });

  // Build display cards by baking the child-name substitution in now.
  // Once frozen in the snapshot, the text can't change until the next
  // transition — even if `substituteChildName` is recomputed.
  const buildCards = useCallback(
    (prompts: PromptItem[]): Snapshot['cards'] =>
      prompts.map((p) => ({
        displayText: substituteChildName(p.text),
        rawText: p.text,
      })),
    [substituteChildName],
  );

  // Ref tracks latest displayedPrompts + buildCards so the animation
  // callback (captured in a closure) always uses current data.
  const latestRef = useRef({ displayedPrompts, buildCards });
  useEffect(() => {
    latestRef.current = { displayedPrompts, buildCards };
  }, [displayedPrompts, buildCards]);

  // Sync snapshot with displayedPrompts whenever we are NOT mid-transition.
  // This covers initial load, children store rehydration, and any late-
  // arriving data after a transition completes. During a transition,
  // the lock blocks this — the runTransition callback handles the swap.
  useEffect(() => {
    if (!transitionLockRef.current) {
      setSnapshot((prev) => ({
        generation: prev.generation,
        cards: buildCards(displayedPrompts),
      }));
    }
  }, [displayedPrompts, buildCards]);

  // ─── Unified transition orchestrator ─────────────────────
  //
  // Every prompt-changing action (pill tap, child tab, shuffle)
  // runs this same sequence so the screen always behaves the same way:
  //
  //   1. Start wrapper fade-out (700ms, gentle exhale)
  //   2. Apply the state change NOW (in parallel with fade-out) so the
  //      fetch / cache lookup can start immediately. For cache hits
  //      (common case), new data is ready within a frame.
  //   3. When fade-out finishes, bump cardGeneration → cards remount
  //      with current data at their own opacity 0.
  //   4. Post-commit effect (below) resets wrapper to 1 after React
  //      commits the new cards, so they stay invisible until each
  //      card's own staggered fade-in plays.
  //
  // The lock ref prevents a second tap from starting another transition
  // while one is already running — React batching alone wouldn't stop
  // two synchronous taps from both passing the state-based check.
  const runTransition = (applyChange: () => void) => {
    if (transitionLockRef.current) return;
    transitionLockRef.current = true;
    setIsTransitioning(true);

    const finish = () => {
      transitionLockRef.current = false;
      setIsTransitioning(false);
    };

    if (reduceMotion) {
      // No animation — apply change, then let the sync effect pick up
      // the new displayedPrompts on the next render (lock is released).
      applyChange();
      finish();
      return;
    }

    // Kick off fade-out + state change in parallel. The snapshot stays
    // frozen (lock is true) so cards keep showing old text through the fade.
    Animated.timing(cardsFadeAnim, {
      toValue: 0,
      duration: 700,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: true,
    }).start(() => {
      // Fade-out done. ONE setState swaps both data and generation
      // atomically — guarantees cards unmount + new cards mount in
      // the same commit. Two separate setStates would cause an
      // intermediate render with new data on old-keyed cards (flash).
      //
      // IMPORTANT: don't reset cardsFadeAnim here. The post-commit
      // effect resets it *after* React commits the new cards, so the
      // old cards can't flash at full opacity during the swap.
      const { displayedPrompts: latest, buildCards: build } = latestRef.current;
      setSnapshot((prev) => ({
        generation: prev.generation + 1,
        cards: build(latest),
      }));
      finish();
    });

    applyChange();
  };

  const handleThemeChange = (theme: ThemeValue) => {
    if (theme === activeTheme) return;
    runTransition(() => setActiveTheme(theme));
  };

  const handleChildChange = (id: string | null) => {
    if (id === activeChildId) return;
    runTransition(() => setActiveChildId(id));
  };

  const handleShuffle = () => {
    if (transitionLockRef.current) return;

    // Spin the shuffle icon 180° — completes as the first new card
    // is landing into place. Resets back to 0 after.
    Animated.timing(shuffleSpinAnim, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      shuffleSpinAnim.setValue(0);
    });

    runTransition(() => setShuffleSeed((s) => s + 1));
  };

  // After snapshot.generation bumps, new PromptCards mount with their
  // own fadeAnim starting at 0 — so they're invisible on their own.
  // We can safely reset the wrapper opacity to 1 here, AFTER React
  // commits the new cards. Skips the first mount.
  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    cardsFadeAnim.setValue(1);
  }, [snapshot.generation]);

  const handleSelectPrompt = (promptText: string) => {
    if (!hasAccess) {
      Alert.alert(
        'Subscribe to record',
        'Subscribe to record new memories. Your existing memories are always safe.',
      );
      return;
    }
    const substituted = substituteChildName(promptText);
    router.push({
      pathname: '/(main)/recording',
      params: { promptText: substituted },
    });
  };

  // ─── Loading State ─────────────────────────────────────

  if (isLoading && allPrompts.length === 0) {
    return (
      <View style={styles.container}>
        <TopBar title="Prompts" showBack />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </View>
    );
  }

  // ─── Error State ───────────────────────────────────────

  if (loadError && allPrompts.length === 0) {
    return (
      <View style={styles.container}>
        <TopBar title="Prompts" showBack />
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.errorHeading}>Couldn't load prompts</Text>
          <Text style={styles.errorBody}>{loadError}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar title="Prompts" showBack />

      {/* Row 1: Theme pills — horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillScroll}
        contentContainerStyle={styles.pillRow}
      >
        {THEMES.map((theme) => (
          <Pressable
            key={theme.value}
            onPress={() => handleThemeChange(theme.value)}
            style={[
              styles.pill,
              activeTheme === theme.value ? styles.pillActive : styles.pillInactive,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                activeTheme === theme.value ? styles.pillTextActive : styles.pillTextInactive,
              ]}
            >
              {theme.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Row 2: Child pills — horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}
      >
        <ChildTab
          label="All"
          color={colors.general}
          active={activeChildId === null}
          onPress={() => handleChildChange(null)}
          showDot={false}
        />
        {children.map((child) => (
          <ChildTab
            key={child.id}
            label={child.name}
            color={childColors[child.colorIndex]?.hex ?? childColors[0].hex}
            active={activeChildId === child.id}
            onPress={() => handleChildChange(child.id)}
          />
        ))}
      </ScrollView>

      {/* Info hint */}
      <View style={styles.hintRow}>
        <Ionicons name="mic-outline" size={14} color={colors.textMuted} />
        <Text style={styles.hintText}>Tap any prompt to start recording</Text>
      </View>

      {/* Prompt cards */}
      <ScrollView
        contentContainerStyle={styles.cardList}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: cardsFadeAnim, gap: spacing(3) }}>
          {snapshot.cards.map((card, i) => (
            <PromptCard
              key={`${snapshot.generation}-${i}`}
              text={card.displayText}
              index={i}
              reduceMotion={reduceMotion}
              onPress={() => handleSelectPrompt(card.rawText)}
            />
          ))}

          {snapshot.cards.length === 0 && !isLoading && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                No prompts for this combo — try another theme
              </Text>
            </View>
          )}
        </Animated.View>
      </ScrollView>

      {/* Shuffle button — fixed above phone nav area */}
      <View style={[styles.shuffleWrapper, { bottom: Math.max(insets.bottom, spacing(4)) + spacing(4) }]}>
        <Pressable
          onPress={handleShuffle}
          disabled={isTransitioning}
          style={({ pressed }) => [
            styles.shuffleButton,
            (pressed || isTransitioning) && { opacity: 0.6 },
          ]}
        >
          <Animated.View
            style={{
              transform: [{
                rotate: shuffleSpinAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              }],
            }}
          >
            <Ionicons name="shuffle-outline" size={20} color={colors.accent} />
          </Animated.View>
          <Text style={styles.shuffleText}>Shuffle</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
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
  // ─── Theme Pills ───────────────────
  pillScroll: {
    flexGrow: 0,
  },
  pillRow: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    gap: spacing(2),
  },
  pill: {
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
    borderRadius: radii.full,
    minHeight: minTouchTarget,
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.accent,
  },
  pillInactive: {
    backgroundColor: colors.tag,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: colors.card,
  },
  pillTextInactive: {
    color: colors.textSoft,
  },
  // ─── Child Tabs ────────────────────
  tabScroll: {
    flexGrow: 0,
  },
  tabRow: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
    gap: spacing(2),
    alignItems: 'center',
  },
  // ─── Prompt Cards ───────────────────
  cardList: {
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(24),
    gap: spacing(3),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    padding: spacing(6),
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardText: {
    ...typography.promptCard,
    color: colors.text,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  hintText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  emptyState: {
    paddingTop: spacing(16),
    alignItems: 'center',
  },
  emptyText: {
    ...typography.formLabel,
    color: colors.textSoft,
    textAlign: 'center',
  },
  // ─── Shuffle Button ─────────────────
  shuffleWrapper: {
    position: 'absolute',
    alignSelf: 'center',
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.card,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(5),
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
    minHeight: minTouchTarget,
  },
  shuffleText: {
    ...typography.formLabel,
    color: colors.accent,
    fontWeight: '600',
  },
});
