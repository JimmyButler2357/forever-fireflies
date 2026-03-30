import { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
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
} from '@/constants/theme';
import {
  PREVIEW_FEED_ENTRIES,
  PREVIEW_FAVORITES,
  PREVIEW_SEARCH_ENTRIES,
} from '@/constants/previewData';
import EntryCard from '@/components/EntryCard';
import PrimaryButton from '@/components/PrimaryButton';

// No-op handler — preview cards are visual-only
const noop = () => {};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SLIDE_COUNT = 3;

/**
 * Welcome Preview — onboarding screen 8.
 *
 * Horizontal swipeable carousel — one feature per slide.
 * Each slide breathes: one idea, one visual, one moment.
 *
 * Slide 1: "Your daily feed" — sample home entry cards
 * Slide 2: "Your favorite moments" — core memory cards with golden glow
 * Slide 3: "Find any memory in seconds" — mock search + highlighted results
 */
export default function WelcomePreviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  // Track which slide is active based on scroll position.
  // Think of it like a ruler — we divide the total scroll distance
  // by the screen width to figure out which "page" we're on.
  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const slideIndex = Math.round(offsetX / SCREEN_WIDTH);
    if (slideIndex !== activeSlide && slideIndex >= 0 && slideIndex < SLIDE_COUNT) {
      setActiveSlide(slideIndex);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ─── Carousel ─────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.carousel}
      >
        {/* ─── Slide 1: Daily Feed ──────────────────── */}
        <View style={styles.slide}>
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.heading}>
              Here's what your journal looks like, 6 months from now.
            </Text>
            <Text style={styles.subheading}>
              Every bedtime story, every funny thing they said.
            </Text>
            <View style={styles.cardList}>
              {PREVIEW_FEED_ENTRIES.slice(0, 3).map((entry, i) => (
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
          </ScrollView>
        </View>

        {/* ─── Slide 2: Favorite Moments ────────────── */}
        <View style={styles.slide}>
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.heading}>
              Your favorite moments, all in one place.
            </Text>
            <Text style={styles.subheading}>
              The ones you'll come back to again and again.
            </Text>
            <View style={styles.cardList}>
              {PREVIEW_FAVORITES.map((entry, i) => (
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
          </ScrollView>
        </View>

        {/* ─── Slide 3: Search ──────────────────────── */}
        <View style={styles.slide}>
          <ScrollView
            style={styles.slideScroll}
            contentContainerStyle={styles.slideScrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.heading}>
              Find any memory in seconds.
            </Text>
            <Text style={styles.subheading}>
              Search by word, by child, by date.
            </Text>

            {/* Mock search bar */}
            <View style={styles.mockSearchBar}>
              <Ionicons
                name="search-outline"
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.mockSearchText}>first</Text>
            </View>

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
          </ScrollView>
        </View>
      </ScrollView>

      {/* ─── Bottom: dots + CTA ───────────────────────── */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(12) }]}>
        {/* Dot indicators */}
        <View style={styles.dots}>
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeSlide ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

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
  carousel: {
    flex: 1,
  },
  // ─── Slides ────────────────────────────────────────
  slide: {
    width: SCREEN_WIDTH,
  },
  slideScroll: {
    flex: 1,
  },
  slideScrollContent: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(8),
    paddingBottom: spacing(24), // room above fixed bottom bar
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
    marginBottom: spacing(6),
  },
  cardList: {
    gap: 10,
  },
  // ─── Mock Search Bar ──────────────────────────────
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
  // ─── Result Count ─────────────────────────────────
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
  // ─── Bottom: Dots + CTA ───────────────────────────
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(3),
    backgroundColor: colors.bg,
    alignItems: 'center',
    gap: spacing(4),
  },
  dots: {
    flexDirection: 'row',
    gap: spacing(2),
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  dotInactive: {
    backgroundColor: colors.border,
  },
});
