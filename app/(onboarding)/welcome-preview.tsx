import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
} from '@/constants/theme';
import {
  PREVIEW_FEED_ENTRIES,
  PREVIEW_CORE_MEMORIES,
  PREVIEW_SEARCH_ENTRIES,
} from '@/constants/previewData';
import EntryCard from '@/components/EntryCard';
import PrimaryButton from '@/components/PrimaryButton';

// No-op handler — preview cards are visual-only
const noop = () => {};

/**
 * Welcome Preview — onboarding screen 8.
 *
 * Shows what the app looks like with months of sample data so parents
 * see what they're building toward. Three vertical sections:
 * 1. "Your daily feed" — Home-style entry cards
 * 2. "Your favorite moments" — Core Memory elevated cards
 * 3. "Find any memory instantly" — Mock search with highlighted results
 */
export default function WelcomePreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing(32) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Header ─────────────────────────────────── */}
        <View style={styles.header}>
          <Text style={styles.heading}>
            Here's what your journal looks like, 6 months from now...
          </Text>
          <Text style={styles.subheading}>
            Every bedtime story, every funny thing they said — all in one place.
          </Text>
        </View>

        {/* ─── Section 1: Daily Feed ──────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Ionicons name="home-outline" size={16} color={colors.textSoft} />
            <Text style={styles.sectionLabel}>Your daily feed</Text>
          </View>
          <View style={styles.cardList}>
            {PREVIEW_FEED_ENTRIES.map((entry, i) => (
              <EntryCard
                key={`feed-${i}`}
                entry={entry}
                variant="home"
                index={i}
                onPress={noop}
                showTags={false}
              />
            ))}
          </View>
        </View>

        {/* ─── Section 2: Favorite Moments ────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Ionicons name="heart-outline" size={16} color={colors.accent} />
            <Text style={[styles.sectionLabel, { color: colors.accent }]}>
              Your favorite moments
            </Text>
          </View>
          <View style={styles.cardList}>
            {PREVIEW_CORE_MEMORIES.map((entry, i) => (
              <EntryCard
                key={`core-${i}`}
                entry={entry}
                variant="coreMemory"
                index={i}
                onPress={noop}
                onPlayAudio={noop}
              />
            ))}
          </View>
        </View>

        {/* ─── Section 3: Search ──────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Ionicons name="search-outline" size={16} color={colors.textSoft} />
            <Text style={styles.sectionLabel}>Find any memory instantly</Text>
          </View>

          {/* Mock search bar */}
          <View style={styles.mockSearchBar}>
            <Ionicons
              name="search-outline"
              size={16}
              color={colors.textMuted}
            />
            <Text style={styles.mockSearchText}>first</Text>
          </View>

          {/* Search results with highlighted matches */}
          <View style={styles.cardList}>
            {PREVIEW_SEARCH_ENTRIES.map((entry, i) => (
              <EntryCard
                key={`search-${i}`}
                entry={entry}
                variant="home"
                index={i}
                onPress={noop}
                highlightQuery="first"
                showTags={false}
              />
            ))}
          </View>

          {/* Result count pill */}
          <View style={styles.resultCountPill}>
            <Text style={styles.resultCountText}>2 memories found</Text>
          </View>
        </View>
      </ScrollView>

      {/* ─── Fixed CTA at bottom ─────────────────────── */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(12) }]}>
        <PrimaryButton
          label="Keep going"
          onPress={() => router.push('/(onboarding)/paywall')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing(5),
  },
  // ─── Header ─────────────────────────────────────
  header: {
    paddingTop: spacing(8),
    paddingBottom: spacing(6),
    alignItems: 'center',
  },
  heading: {
    ...typography.onboardingHeading,
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
  },
  // ─── Sections ───────────────────────────────────
  section: {
    marginBottom: spacing(8),
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  sectionLabel: {
    ...typography.timestamp,
    color: colors.textSoft,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardList: {
    gap: 10,
  },
  // ─── Mock Search Bar ────────────────────────────
  mockSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: spacing(3),
    gap: spacing(2),
    ...shadows.sm,
  },
  mockSearchText: {
    ...typography.formLabel,
    color: colors.text,
  },
  // ─── Result Count ───────────────────────────────
  resultCountPill: {
    alignSelf: 'center',
    backgroundColor: colors.text,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radii.full,
    marginTop: spacing(3),
  },
  resultCountText: {
    ...typography.caption,
    color: colors.card,
    fontWeight: '600',
  },
  // ─── Bottom CTA ─────────────────────────────────
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    backgroundColor: colors.bg,
  },
});
