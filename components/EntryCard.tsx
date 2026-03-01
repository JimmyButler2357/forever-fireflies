import { useRef, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  radii,
  shadows,
  spacing,
} from '@/constants/theme';
import { childColorWithOpacity } from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import PaperTexture from './PaperTexture';

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
  backgroundColor: 'rgba(232,114,74,0.20)',
};

interface EntryCardEntry {
  childNames: string[];
  childColors: string[];
  date: string;
  time: string;
  preview: string;
  tags: string[];
  isFavorited: boolean;
  hasAudio: boolean;
}

interface EntryCardProps {
  entry: EntryCardEntry;
  onPress: () => void;
  onPlayAudio?: () => void;
  variant?: 'home' | 'coreMemory';
  index?: number;
  highlightQuery?: string;
  showTags?: boolean;
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
  variant = 'home',
  index = 0,
  highlightQuery,
  showTags = true,
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

  const hasFooterContent =
    (showTags && entry.tags.length > 0) ||
    (isCoreMemory && entry.hasAudio);

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
          pressed && { backgroundColor: colors.cardPressed },
        ]}
      >
        <PaperTexture radius={isCoreMemory ? radii.lg : radii.card} />

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
              {entry.date} {'\u00B7'} {entry.time}
            </Text>
          </View>
          {entry.isFavorited && (
            <Ionicons
              name="heart"
              size={14}
              color={colors.heartFilled}
            />
          )}
        </View>

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
                  style={styles.playButton}
                >
                  <Ionicons name="play" size={12} color={colors.accent} />
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
    borderColor: childColorWithOpacity('#E8724A', 0.20),
    shadowColor: '#E8724A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 2,
  },
  favoritedCard: {
    borderColor: childColorWithOpacity('#E8724A', 0.25),
    shadowColor: '#E8724A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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
    fontWeight: '600',
  },
  meta: {
    ...typography.cardMeta,
    color: colors.textMuted,
  },
  homePreview: {
    ...typography.entryPreview,
    color: colors.text,
    marginBottom: 6,
  },
  coreMemoryPreview: {
    ...typography.coreMemoriesPreview,
    color: colors.text,
    marginBottom: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tags: {
    flexDirection: 'row',
    gap: spacing(1),
    flex: 1,
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
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
