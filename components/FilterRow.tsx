import React, { useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  minTouchTarget,
} from '@/constants/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

interface FilterRowProps {
  label: string;
  /** Number of active selections, shown as "· N selected" in the header. */
  selectionCount?: number;
  /** Whether the row is currently expanded. Parent owns this state. */
  expanded: boolean;
  onToggle: () => void;
  /** Compact summary shown when collapsed (typically the active chips). */
  summary?: React.ReactNode;
  /** Full chip lane shown when expanded. */
  children: React.ReactNode;
  /** Hide the header chevron when there's nothing to expand. */
  collapsible?: boolean;
  /** Empty-state placeholder when there are no chips to show. */
  emptyHint?: string;
}

/**
 * One faceted filter row: small uppercase label, optional selection count,
 * a chevron toggle, and either a horizontal-scroll chip lane (expanded) or
 * an inline summary of the current selection (collapsed).
 *
 * Each category gets its own row, so Date and Location are never hidden
 * behind a horizontal scroll the way they were in the old single-row layout.
 */
export default function FilterRow({
  label,
  selectionCount = 0,
  expanded,
  onToggle,
  summary,
  children,
  collapsible = true,
  emptyHint,
}: FilterRowProps) {
  const reduceMotion = useReduceMotion();

  const handleToggle = useCallback(() => {
    if (!collapsible) return;
    onToggle();
  }, [onToggle, collapsible]);

  const showSummary = !expanded && summary != null;
  const hasContent = emptyHint == null;

  return (
    <Animated.View
      style={styles.row}
      layout={reduceMotion ? undefined : LinearTransition.duration(250)}
    >
      <Pressable
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.header,
          pressed && collapsible && { opacity: 0.7 },
        ]}
        accessibilityRole={collapsible ? 'button' : undefined}
        accessibilityState={{ expanded }}
        accessibilityLabel={
          collapsible
            ? `Filter by ${label}${selectionCount > 0 ? `, ${selectionCount} selected` : ''}, ${expanded ? 'collapse' : 'expand'}`
            : label
        }
        disabled={!collapsible}
      >
        <View style={styles.headerLabelGroup}>
          <Text style={styles.label}>{label.toUpperCase()}</Text>
          {selectionCount > 0 && (
            <Text style={styles.count}>{` · ${selectionCount} selected`}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          {showSummary && <View style={styles.summary}>{summary}</View>}
          {collapsible && (
            <Ionicons
              name={expanded ? 'chevron-down' : 'chevron-forward'}
              size={16}
              color={colors.textMuted}
            />
          )}
        </View>
      </Pressable>

      {expanded && hasContent && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.lane}
          contentContainerStyle={styles.laneContent}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      )}
      {expanded && !hasContent && (
        <Text style={styles.emptyHint}>{emptyHint}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  header: {
    minHeight: minTouchTarget,
    paddingHorizontal: spacing(5),
    paddingVertical: spacing(2),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing(2),
  },
  headerLabelGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 0,
  },
  label: {
    ...typography.caption,
    color: colors.textSoft,
    letterSpacing: 0.5,
  },
  count: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: spacing(2),
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    gap: spacing(1),
  },
  lane: {
    flexGrow: 0,
  },
  laneContent: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    gap: spacing(2),
    alignItems: 'center',
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textMuted,
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
});
