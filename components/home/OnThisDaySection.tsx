import { useMemo, useState, useRef } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  colors,
  spacing,
  radii,
  shadows,
  fonts,
  childColors,
} from '@/constants/theme';
import { formatDate } from '@/lib/dateUtils';
import { buildChildMap } from '@/lib/entryHelpers';
import SectionLabel from './SectionLabel';
import type { Entry } from '@/stores/entriesStore';
import type { Child } from '@/stores/childrenStore';

/**
 * "On This Day" — surfaces nostalgic past entries from
 * meaningful time intervals (1 week, 1 month, 6 months, 1 year ago).
 *
 * Displays as a horizontal swipeable carousel of Polaroid-style cards.
 * Hidden entirely when no matching entries exist.
 */

const TIME_MARKERS = [
  { days: 7, label: 'One week ago' },
  { days: 30, label: 'One month ago' },
  { days: 180, label: 'Six months ago' },
  { days: 365, label: 'One year ago' },
];

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_HORIZONTAL_PADDING = spacing(4); // 16px each side
const CARD_WIDTH = SCREEN_WIDTH - CARD_HORIZONTAL_PADDING * 2;

/** Format Date as YYYY-MM-DD in local time */
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface OTDCard {
  entry: Entry;
  label: string;
}

export default function OnThisDaySection({ entries, children }: { entries: Entry[]; children: Child[] }) {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);

  const childMap = useMemo(() => buildChildMap(children), [children]);

  // Find entries that match each time marker's date
  const cards = useMemo(() => {
    const result: OTDCard[] = [];
    const today = new Date();

    for (const marker of TIME_MARKERS) {
      const target = new Date(today);
      target.setDate(today.getDate() - marker.days);
      const targetStr = toDateStr(target);

      // Find the first entry on that exact date
      const match = entries.find((e) => !e.isDeleted && e.date === targetStr);
      if (match) {
        result.push({ entry: match, label: marker.label });
      }
    }

    return result;
  }, [entries]);

  // Hide section if no markers have matching entries
  if (cards.length === 0) return null;

  const handleScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x;
    const index = Math.round(x / SCREEN_WIDTH);
    setActiveIndex(Math.max(0, Math.min(index, cards.length - 1)));
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelWrap}>
        <SectionLabel label="On this day" />
      </View>

      <FlatList
        data={cards}
        keyExtractor={(item) => item.entry.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        pagingEnabled
        onMomentumScrollEnd={handleScroll}
        renderItem={({ item }) => {
          const firstChildId = item.entry.childIds[0];
          const child = firstChildId ? childMap[firstChildId] : null;
          const childColor = child
            ? childColors[child.colorIndex]?.hex ?? childColors[0].hex
            : colors.textMuted;

          return (
            <View style={styles.cardPage}>
              <Pressable
                onPress={() => router.push({ pathname: '/(main)/entry-detail', params: { entryId: item.entry.id } })}
                style={({ pressed }) => [
                  styles.polaroid,
                  pressed && { opacity: 0.9 },
                ]}
              >
                <LinearGradient
                  colors={['#fdf8f0', '#f5ede3']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.polaroidContent}
                >
                  <Text style={styles.timeBadge}>{item.label}</Text>

                  {child && (
                    <View style={styles.childRow}>
                      <View style={[styles.childDot, { backgroundColor: childColor }]} />
                      <Text style={styles.childName}>{child.name}</Text>
                    </View>
                  )}

                  <Text style={styles.preview} numberOfLines={3}>
                    {item.entry.text || item.entry.title || ''}
                  </Text>
                </LinearGradient>

                <Text style={styles.dateFooter}>
                  {formatDate(item.entry.date, 'long')}
                </Text>
              </Pressable>
            </View>
          );
        }}
      />

      {/* Pagination dots */}
      {cards.length > 1 && (
        <View style={styles.dots}>
          {cards.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No horizontal padding — carousel bleeds to edges
  },
  labelWrap: {
    paddingHorizontal: spacing(4),
  },
  cardPage: {
    width: SCREEN_WIDTH,
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    overflow: 'visible' as const,
  },
  polaroid: {
    width: CARD_WIDTH,
    backgroundColor: colors.card,
    borderRadius: radii.sm,
    padding: spacing(3),
    paddingBottom: spacing(6),
    transform: [{ rotate: '-1.5deg' }],
    ...shadows.md,
    marginVertical: spacing(2),
  },
  polaroidContent: {
    borderRadius: radii.sm,
    padding: spacing(4),
    gap: spacing(2),
  },
  timeBadge: {
    fontFamily: fonts.serifBold,
    fontSize: 16,
    color: colors.text,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
  },
  childDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  childName: {
    fontSize: 10,
    color: colors.textSoft,
  },
  preview: {
    fontFamily: fonts.serif,
    fontSize: 14,
    fontStyle: 'italic',
    color: colors.text,
    lineHeight: 22,
  },
  dateFooter: {
    fontFamily: fonts.serif,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing(2),
    paddingHorizontal: spacing(1),
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing(2),
    marginTop: spacing(3),
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: colors.accent,
  },
  dotInactive: {
    backgroundColor: colors.textMuted,
    opacity: 0.3,
  },
});
