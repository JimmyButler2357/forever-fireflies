import { useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { colors, fonts, radii } from '@/constants/theme';

export const ROW_HEIGHT = 40;
export const VISIBLE_ROWS = 3;
export const COLUMN_HEIGHT = ROW_HEIGHT * VISIBLE_ROWS;

export interface ScrollColumnProps {
  items: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  /** When true, the column wraps around infinitely in both directions */
  loop?: boolean;
}

export default function ScrollColumn({ items, selectedIndex, onSelect, loop = false }: ScrollColumnProps) {
  const scrollRef = useRef<ScrollView>(null);
  const hasLaidOut = useRef(false);

  // When looping, we render 5 copies and start in the middle (copy 3).
  // That gives 2 full cycles of buffer in each direction — plenty for
  // any realistic scrolling before the silent jump resets position.
  const loopCopies = 5;
  const loopOffset = loop ? Math.floor(loopCopies / 2) * items.length : 0;
  const displayItems = useMemo(
    () => (loop ? Array(loopCopies).fill(items).flat() : items),
    [items, loop],
  );

  /** Convert a raw scroll index to the real item index (0 .. items.length-1) */
  const toRealIndex = useCallback(
    (raw: number) => ((raw % items.length) + items.length) % items.length,
    [items.length],
  );

  // Two separate handlers: drag-end just updates the selection,
  // momentum-end also re-centers. This prevents the silent jump from
  // conflicting with momentum that's still in progress.
  const handleDragEnd = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const rawIndex = Math.round(offsetY / ROW_HEIGHT);
    const realIndex = loop ? toRealIndex(rawIndex) : Math.max(0, Math.min(rawIndex, items.length - 1));
    onSelect(realIndex);
  }, [items.length, onSelect, loop, toRealIndex]);

  const handleMomentumEnd = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const rawIndex = Math.round(offsetY / ROW_HEIGHT);

    if (loop) {
      const realIndex = toRealIndex(rawIndex);
      onSelect(realIndex);

      // If outside the middle copy, silently jump back so the user
      // always has buffer in both directions.
      const middleStart = Math.floor(loopCopies / 2) * items.length;
      const middleEnd = middleStart + items.length - 1;
      if (rawIndex < middleStart || rawIndex > middleEnd) {
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({
            y: (middleStart + realIndex) * ROW_HEIGHT,
            animated: false,
          });
        });
      }
    } else {
      const clamped = Math.max(0, Math.min(rawIndex, items.length - 1));
      onSelect(clamped);
    }
  }, [items.length, onSelect, loop, toRealIndex]);

  const handleLayout = useCallback(() => {
    hasLaidOut.current = true;
    const targetIndex = loopOffset + selectedIndex;
    scrollRef.current?.scrollTo({ y: targetIndex * ROW_HEIGHT, animated: false });
  }, [selectedIndex, loopOffset]);

  // Re-center scroll when the parent changes selectedIndex externally
  // (e.g. day clamping when month changes from 31 to 28 days)
  useEffect(() => {
    if (hasLaidOut.current) {
      const targetIndex = loopOffset + selectedIndex;
      scrollRef.current?.scrollTo({ y: targetIndex * ROW_HEIGHT, animated: false });
    }
  }, [selectedIndex, loopOffset]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.highlightBand} />
      <View style={styles.fadeTop} />
      <View style={styles.fadeBottom} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        onLayout={handleLayout}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleDragEnd}
        contentContainerStyle={{ paddingVertical: ROW_HEIGHT }}
      >
        {displayItems.map((item, i) => {
          const realIndex = loop ? toRealIndex(i) : i;
          const isSelected = realIndex === selectedIndex;
          return (
            <Pressable
              key={`${item}-${i}`}
              onPress={() => {
                onSelect(realIndex);
                const scrollTarget = loop ? loopOffset + realIndex : realIndex;
                scrollRef.current?.scrollTo({ y: scrollTarget * ROW_HEIGHT, animated: true });
              }}
              style={styles.row}
            >
              <Text style={isSelected ? styles.selectedText : styles.unselectedText}>
                {item}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    height: COLUMN_HEIGHT,
    overflow: 'hidden',
    position: 'relative',
  },
  highlightBand: {
    position: 'absolute',
    top: ROW_HEIGHT,
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    backgroundColor: colors.accentSoft,
    borderRadius: radii.sm,
    zIndex: 0,
  },
  fadeTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  fadeBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    zIndex: 2,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  row: {
    height: ROW_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    fontFamily: fonts.serif,
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  unselectedText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.textMuted,
  },
});
