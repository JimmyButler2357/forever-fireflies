import { useRef, useEffect, useState } from 'react';
import { View, Text, Pressable, Animated, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fonts,
  typography,
  radii,
  shadows,
  spacing,
  hitSlop,
  childColorWithOpacity,
} from '@/constants/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import DraftBadge from '@/components/DraftBadge';
import type { DraftStatus } from '@/stores/draftStore';
import { storageService } from '@/services/storage.service';
import { useAuthStore } from '@/stores/authStore';

// ─── Highlight Helper ────────────────────────────────────

/**
 * Splits text into segments, wrapping matched portions in a highlight style.
 * Think of it like using a yellow highlighter on a printed page —
 * only the matching words get the color behind them.
 */
function HighlightedText({
  text,
  query,
  style,
  numberOfLines,
}: {
  text: string;
  query: string;
  style: any;
  numberOfLines?: number;
}) {
  const trimmed = query.trim();
  if (!trimmed) {
    return <Text style={style} numberOfLines={numberOfLines}>{text}</Text>;
  }

  // Escape special regex characters so the user's query is treated literally
  const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <Text key={i} style={highlightStyle}>
            {part}
          </Text>
        ) : (
          part
        ),
      )}
    </Text>
  );
}

const highlightStyle = {
  backgroundColor: childColorWithOpacity(colors.accent, 0.20),
};

// ─── Quick-Blend Gradient Stops ─────────────────────────
/**
 * Builds color stops for a "quick blend" gradient.
 *
 * Imagine a striped pole where each color band is solid,
 * then there's a very short fade into the next color.
 * We achieve this by doubling each color with two stops —
 * one near the end of its segment, one near the start of the next.
 * The 10% blend zone between them creates a quick transition.
 */
const EMPTY_BLEND_STOPS: { colors: string[]; locations: number[] } = {
  colors: [],
  locations: [],
};

function buildQuickBlendStops(inputColors: string[]): {
  colors: string[];
  locations: number[];
} {
  const n = inputColors.length;
  if (n < 2) return EMPTY_BLEND_STOPS;

  const blend = 0.1; // 10% of total bar height for each blend zone
  const halfBlend = blend / 2;

  const outColors: string[] = [];
  const locations: number[] = [];

  for (let i = 0; i < n; i++) {
    const segStart = i / n;
    const segEnd = (i + 1) / n;

    // First stop: where this color's solid zone begins
    outColors.push(inputColors[i]);
    locations.push(i === 0 ? 0 : segStart + halfBlend);

    // Second stop: where this color's solid zone ends
    outColors.push(inputColors[i]);
    locations.push(i === n - 1 ? 1 : segEnd - halfBlend);
  }

  return { colors: outColors, locations };
}

interface EntryCardEntry {
  childNames: string[];
  childColors: string[];
  childAges?: string[];
  date: string;
  time: string;
  title?: string;
  preview: string;
  tags: string[];
  isFavorited: boolean;
  hasAudio: boolean;
  audioStoragePath?: string;
  firstMemoryBadge?: { names: string[]; colorHexes: string[] };
  photos?: string[];
}

interface EntryCardProps {
  entry: EntryCardEntry;
  onPress: () => void;
  onPlayAudio?: () => void;
  /** Whether this card's audio is currently playing (managed by parent). */
  isPlaying?: boolean;
  variant?: 'home' | 'coreMemory';
  index?: number;
  highlightQuery?: string;
  showTags?: boolean;
  /** When set, shows a sync status badge (pending/syncing/failed).
   *  Used for offline drafts that haven't been uploaded yet. */
  syncStatus?: DraftStatus;
  /** Warm gold glow border — used for first-entry celebration on Home. */
  glowing?: boolean;
}

/**
 * Entry card with two variants:
 *
 * **Home** (default): Standard card — system sans preview, 2 lines, subtle shadow.
 * **Core Memory**: Elevated — Georgia serif preview, 3 lines, amber glow, inline audio button.
 *
 * Includes a staggered fadeInUp entrance animation (60ms delay per card)
 * using RN's built-in Animated API.
 */
export default function EntryCard({
  entry,
  onPress,
  onPlayAudio,
  isPlaying = false,
  variant = 'home',
  index = 0,
  highlightQuery,
  showTags = true,
  syncStatus,
  glowing = false,
}: EntryCardProps) {
  const isCoreMemory = variant === 'coreMemory';
  const reduceMotion = useReduceMotion();

  // ─── FadeInUp stagger animation ────────────────────────
  const fadeAnim = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(reduceMotion ? 0 : 16)).current;

  useEffect(() => {
    if (reduceMotion) return; // Already at final state
    const delay = index * 60; // 60ms stagger per card
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const hasMultipleChildren = entry.childColors.length >= 2;
  const blendStops = hasMultipleChildren
    ? buildQuickBlendStops(entry.childColors)
    : EMPTY_BLEND_STOPS;

  const hasFooterContent =
    (showTags && entry.tags.length > 0) ||
    (isCoreMemory && entry.hasAudio);
  const [resolvedPhotos, setResolvedPhotos] = useState<string[]>([]);
  // Pulled once for the whole card so getEntryMediaUrl can skip its
  // per-photo entries.lookup (review fix #12). MVP users always belong
  // to one family, so this is stable for the screen lifetime.
  const familyId = useAuthStore((s) => s.familyId);

  useEffect(() => {
    let cancelled = false;

    const resolvePhotoUrls = async () => {
      if (!entry.photos || entry.photos.length === 0) {
        setResolvedPhotos([]);
        return;
      }

      const urls = await Promise.all(
        entry.photos.slice(0, 3).map(async (uriOrPath) => {
          if (uriOrPath.startsWith('http')) return uriOrPath;
          try {
            return await storageService.getEntryMediaUrl(uriOrPath, familyId ?? undefined);
          } catch {
            return '';
          }
        }),
      );

      if (cancelled) return;
      setResolvedPhotos(urls.filter(Boolean));
    };

    resolvePhotoUrls();
    return () => { cancelled = true; };
  }, [entry.photos, familyId]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          isCoreMemory ? styles.coreMemoryCard : styles.homeCard,
          entry.isFavorited && !isCoreMemory && styles.favoritedCard,
          glowing && styles.glowingCard,
          syncStatus && { opacity: 0.85 },
          pressed && { backgroundColor: colors.cardPressed },
        ]}
      >
        {/* Left accent bar — colored stripe showing which child this entry belongs to.
             When 2+ children, shows a quick-blend gradient between their colors. */}
        {hasMultipleChildren ? (
          <LinearGradient
            colors={blendStops.colors as [string, string, ...string[]]}
            locations={blendStops.locations as [number, number, ...number[]]}
            style={styles.leftBar}
          />
        ) : (
          <View
            style={[
              styles.leftBar,
              { backgroundColor: entry.childColors[0] ?? colors.accent },
            ]}
          />
        )}

        {/* Header: child dots + names, date/time inline, heart far right */}
        <View style={[styles.header, isCoreMemory && styles.coreMemoryHeader]}>
          <View style={styles.childRow}>
            {entry.childNames.map((name, i) => (
              <View key={name} style={styles.childDot}>
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: entry.childColors[i] ?? colors.textMuted },
                  ]}
                />
                <Text
                  style={[
                    styles.childName,
                    { color: entry.childColors[i] ?? colors.textMuted },
                  ]}
                >
                  {name}
                </Text>
              </View>
            ))}
            <Text style={styles.meta}>
              {entry.date}
            </Text>
          </View>
          {syncStatus ? (
            <DraftBadge status={syncStatus} />
          ) : entry.isFavorited ? (
            <View style={styles.heartRow}>
              <Ionicons
                name="heart"
                size={14}
                color={colors.heartFilled}
              />
            </View>
          ) : null}
        </View>

        {/* First memory marker — badge on each child's earliest entry */}
        {entry.firstMemoryBadge && (
          <View style={styles.firstMemoryRow}>
            {entry.firstMemoryBadge.names.map((name, i) => (
              <Text
                key={name}
                style={[
                  styles.firstMemoryBadge,
                  { color: entry.firstMemoryBadge!.colorHexes[i] },
                ]}
              >
                ✦ {name}'s first memory
              </Text>
            ))}
          </View>
        )}

        {/* Title — AI-generated or user-edited entry name */}
        {entry.title ? (
          highlightQuery ? (
            <HighlightedText
              text={entry.title}
              query={highlightQuery}
              style={styles.title}
              numberOfLines={1}
            />
          ) : (
            <Text style={styles.title} numberOfLines={1}>
              {entry.title}
            </Text>
          )
        ) : null}

        {/* Preview text */}
        {highlightQuery ? (
          <HighlightedText
            text={entry.preview}
            query={highlightQuery}
            style={isCoreMemory ? styles.coreMemoryPreview : styles.homePreview}
            numberOfLines={isCoreMemory ? 3 : 2}
          />
        ) : (
          <Text
            style={isCoreMemory ? styles.coreMemoryPreview : styles.homePreview}
            numberOfLines={isCoreMemory ? 3 : 2}
          >
            {entry.preview}
          </Text>
        )}

        {resolvedPhotos.length > 0 && (
          <View style={styles.photoRow}>
            {resolvedPhotos.map((uri, i) => (
              <Image key={`${uri}_${i}`} source={{ uri }} style={styles.photoThumb} />
            ))}
          </View>
        )}

        {/* Bottom row: tags + audio button (conditionally rendered) */}
        {hasFooterContent && (
          <View style={styles.footer}>
            {showTags && (
              <View style={styles.tags}>
                {entry.tags.slice(0, 3).map((tag) => (
                  <View key={tag} style={styles.tagPill}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              {isCoreMemory && entry.hasAudio && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onPlayAudio?.();
                  }}
                  hitSlop={hitSlop.icon}
                  style={({ pressed }) => [
                    styles.playButton,
                    pressed && styles.playButtonPressed,
                  ]}
                >
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={12}
                    color={colors.card}
                  />
                </Pressable>
              )}
            </View>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    paddingVertical: 14,
    paddingHorizontal: spacing(4),
    overflow: 'hidden',
  },
  leftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  homeCard: {
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  coreMemoryCard: {
    borderRadius: radii.lg,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: colors.borderWarm,
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 2,
  },
  favoritedCard: {
    borderColor: childColorWithOpacity(colors.accent, 0.25),
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  glowingCard: {
    borderWidth: 1.5,
    borderColor: childColorWithOpacity(colors.glow, 0.35),
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  coreMemoryHeader: {
    marginBottom: 8,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  childDot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  childName: {
    ...typography.cardMeta,
    fontFamily: fonts.serifBold,
    fontWeight: '600',
  },
  meta: {
    ...typography.cardMeta,
    color: colors.textMuted,
  },
  firstMemoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 4,
    gap: 4,
  },
  firstMemoryBadge: {
    ...typography.caption,
    fontWeight: '600',
  },
  title: {
    ...typography.formLabel,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  homePreview: {
    ...typography.entryPreview,
    color: colors.text,
    marginBottom: 6,
  },
  coreMemoryPreview: {
    ...typography.fireflyJarPreview,
    color: colors.text,
    marginBottom: 10,
  },
  photoRow: {
    flexDirection: 'row',
    gap: spacing(2),
    marginBottom: 8,
  },
  photoThumb: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: colors.tag,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    gap: spacing(1),
    flexShrink: 1,
    overflow: 'hidden',
    marginRight: spacing(2),
  },
  tagPill: {
    backgroundColor: colors.tag,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
  },
  tagText: {
    ...typography.tag,
    color: colors.textSoft,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  playButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: childColorWithOpacity(colors.accent, 0.25),
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonPressed: {
    backgroundColor: childColorWithOpacity(colors.accent, 0.35),
  },
  heartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});
