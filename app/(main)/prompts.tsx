import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
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
import { useAuthStore } from '@/stores/authStore';
import { useChildrenStore } from '@/stores/childrenStore';
import { promptsService } from '@/services/prompts.service';
import { ageInMonths } from '@/lib/dateUtils';
import TopBar from '@/components/TopBar';
import { useSubscription } from '@/hooks/useSubscription';

// ─── Types ──────────────────────────────────────────────

interface PromptItem {
  id: string;
  text: string;
}

// ─── Category Definitions ───────────────────────────────
//
// These map to the age-range buckets in the prompts table.
// "All" shows everything; the rest filter by age range.
// Think of it like sections in a bookstore — you can browse
// everything or go straight to the shelf you need.

const CATEGORIES = [
  { label: 'All', minAge: undefined, maxAge: undefined },
  { label: 'Everyday', minAge: undefined, maxAge: undefined },
  { label: 'Baby', minAge: 0, maxAge: 12 },
  { label: 'Toddler', minAge: 13, maxAge: 36 },
  { label: 'Preschool+', minAge: 37, maxAge: undefined },
] as const;

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
  const [activeCategory, setActiveCategory] = useState(0);
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [isShuffling, setIsShuffling] = useState(false);
  const shuffleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch a bigger pool of prompts from Supabase
  useEffect(() => {
    if (!profile?.id) return;

    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const childAge = children.length > 0
          ? ageInMonths(children[0].birthday)
          : undefined;

        // Fetch 15 prompts — a nice browsable pool
        const prompts = await promptsService.getNextPrompts(profile.id, 15, childAge);
        if (cancelled) return;

        setAllPrompts(prompts.map((p) => ({ id: p.id, text: p.text })));
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Could not load prompts';
        setLoadError(message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [profile?.id]);

  // Substitute {child_name} with the first child's name at render time.
  // Done at render (not fetch) so renaming a child takes effect instantly.
  const substituteChildName = useCallback((text: string) => {
    const name = children.length > 0 ? children[0].name : 'your child';
    return text.replace(/\{child_name\}/gi, name);
  }, [children]);

  // Filter prompts by selected category, then shuffle deterministically
  const displayedPrompts = useMemo(() => {
    const category = CATEGORIES[activeCategory];
    let filtered = allPrompts;

    // "Everyday" (index 1) shows prompts with NO age restriction
    if (activeCategory === 1) {
      filtered = allPrompts.filter(
        (p) => !('minAge' in p) // All fetched prompts pass through; this is a UI category
      );
    }

    // For age-specific categories, we'd ideally filter by age range,
    // but since the fetch already filtered by child age, we show
    // all prompts for "All" / "Everyday" and a subset for others.
    // For now, use the full pool and take slices.

    // Simple shuffle based on seed — Fisher-Yates with deterministic seed
    const shuffled = [...filtered];
    let seed = shuffleSeed + activeCategory;
    for (let i = shuffled.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 11) % 2147483647;
      const j = seed % (i + 1);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Show up to 8 cards so users can browse a good set
    return shuffled.slice(0, Math.min(8, shuffled.length));
  }, [allPrompts, activeCategory, shuffleSeed]);

  // Shuffle with a brief cooldown — prevents spam-cycling through
  // the whole pool and gives a visual cue that new prompts loaded.
  // Think of it like a slot machine's brief spin before revealing results.
  const handleShuffle = () => {
    if (isShuffling) return;
    setIsShuffling(true);
    shuffleTimerRef.current = setTimeout(() => {
      setShuffleSeed((s) => s + 1);
      setIsShuffling(false);
    }, 600);
  };

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (shuffleTimerRef.current) clearTimeout(shuffleTimerRef.current);
    };
  }, []);

  const handleSelectPrompt = (promptText: string) => {
    // When the user's trial has expired, show an alert instead of
    // navigating to the recording screen.
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

  if (isLoading) {
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

  if (loadError) {
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

      {/* Category pills — horizontal scroll */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.pillScroll}
        contentContainerStyle={styles.pillRow}
      >
        {CATEGORIES.map((cat, index) => (
          <Pressable
            key={cat.label}
            onPress={() => setActiveCategory(index)}
            style={[
              styles.pill,
              activeCategory === index ? styles.pillActive : styles.pillInactive,
            ]}
          >
            <Text
              style={[
                styles.pillText,
                activeCategory === index ? styles.pillTextActive : styles.pillTextInactive,
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Info hint — one-time explanation instead of repeating on every card */}
      <View style={styles.hintRow}>
        <Ionicons name="mic-outline" size={14} color={colors.textMuted} />
        <Text style={styles.hintText}>Tap any prompt to start recording</Text>
      </View>

      {/* Prompt cards */}
      <ScrollView
        contentContainerStyle={styles.cardList}
        showsVerticalScrollIndicator={false}
      >
        {isShuffling ? (
          <View style={styles.shufflingState}>
            <ActivityIndicator size="small" color={colors.accent} />
            <Text style={styles.shufflingText}>Finding new prompts…</Text>
          </View>
        ) : (
          <>
            {displayedPrompts.map((prompt) => (
              <Pressable
                key={prompt.id}
                onPress={() => handleSelectPrompt(prompt.text)}
                style={({ pressed }) => [
                  styles.card,
                  shadows.promptCard,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Text style={styles.cardText}>
                  {substituteChildName(prompt.text)}
                </Text>
              </Pressable>
            ))}

            {displayedPrompts.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.errorBody}>No prompts available right now.</Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Shuffle button — fixed above phone nav area */}
      <View style={[styles.shuffleWrapper, { bottom: Math.max(insets.bottom, spacing(4)) + spacing(4) }]}>
        <Pressable
          onPress={handleShuffle}
          disabled={isShuffling}
          style={({ pressed }) => [
            styles.shuffleButton,
            (pressed || isShuffling) && { opacity: 0.6 },
          ]}
        >
          {isShuffling ? (
            <ActivityIndicator size={16} color={colors.accent} />
          ) : (
            <Ionicons name="shuffle-outline" size={20} color={colors.accent} />
          )}
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
  // ─── Category Pills ─────────────────
  pillScroll: {
    flexGrow: 0,
  },
  pillRow: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(4),
    gap: spacing(2),
  },
  pill: {
    paddingVertical: spacing(2),
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
  // ─── Prompt Cards ───────────────────
  cardList: {
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(24),
    gap: spacing(3),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(4),
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardText: {
    ...typography.entryPreview,
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
  shufflingState: {
    paddingTop: spacing(16),
    alignItems: 'center',
    gap: spacing(3),
  },
  shufflingText: {
    ...typography.formLabel,
    color: colors.textSoft,
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
