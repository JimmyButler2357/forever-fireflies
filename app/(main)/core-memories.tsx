import { useMemo, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  colors,
  typography,
  spacing,
  screenColors,
  childColors,
} from '@/constants/theme';
import { useChildrenStore, type Child } from '@/stores/childrenStore';
import { useEntriesStore, type Entry } from '@/stores/entriesStore';
import TopBar from '@/components/TopBar';
import ChildTab from '@/components/ChildTab';
import EntryCard from '@/components/EntryCard';
import PrimaryButton from '@/components/PrimaryButton';

// ─── Helpers ──────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ─── Core Memories Screen ─────────────────────────────────

export default function CoreMemoriesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const entries = useEntriesStore((s) => s.entries);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Build child lookup
  const childMap = useMemo(() => {
    const map: Record<string, Child> = {};
    children.forEach((c) => (map[c.id] = c));
    return map;
  }, [children]);

  // All favorited, non-deleted entries (reverse chronological — newest first)
  const coreMemories = useMemo(
    () => entries.filter((e) => e.isFavorited && !e.isDeleted),
    [entries],
  );

  // Filtered by child tab
  const filteredMemories = useMemo(() => {
    if (!activeFilter) return coreMemories;
    return coreMemories.filter((e) => e.childIds.includes(activeFilter));
  }, [coreMemories, activeFilter]);

  const isMultiChild = children.length >= 2;

  // ─── Map Entry to EntryCard format ─────────────────────

  const entryToCard = (entry: Entry) => {
    const childNames = entry.childIds.map((id) => childMap[id]?.name ?? 'Unknown');
    const entryChildColors = entry.childIds.map(
      (id) => childColors[childMap[id]?.colorIndex ?? 0]?.hex ?? colors.textMuted,
    );
    return {
      childNames,
      childColors: entryChildColors,
      date: formatDate(entry.date),
      time: formatTime(entry.date),
      preview: entry.text,
      tags: entry.tags,
      isFavorited: entry.isFavorited,
      hasAudio: entry.hasAudio,
    };
  };

  return (
    <View style={styles.container}>
      {/* Warm gradient backdrop — top portion only */}
      <LinearGradient
        colors={[screenColors.coreMemoriesBg, colors.bg]}
        locations={[0, 0.35]}
        style={styles.gradientTop}
      />

      {/* Top bar — serif title, no right icons */}
      <TopBar title="Core Memories" titleStyle="serif" showBack />

      {/* Memory count */}
      <View style={styles.countRow}>
        <Ionicons name="heart" size={14} color={colors.heartFilled} />
        <Text style={styles.countText}>
          {coreMemories.length}{' '}
          {coreMemories.length === 1 ? 'memory' : 'memories'} saved
        </Text>
      </View>

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
            onPress={() => setActiveFilter(null)}
            showDot={false}
          />
          {children.map((child) => (
            <ChildTab
              key={child.id}
              label={child.name}
              color={childColors[child.colorIndex]?.hex ?? childColors[0].hex}
              active={activeFilter === child.id}
              onPress={() => setActiveFilter(child.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Entry list — elevated card treatment */}
      <FlatList
        data={filteredMemories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing(8) }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <EntryCard
            entry={entryToCard(item)}
            variant="coreMemory"
            index={index}
            onPress={() => router.push('/(main)/entry-detail')}
            onPlayAudio={() => {
              // Visual only for MVP — no actual playback
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyHeading}>No core memories yet</Text>
            <Text style={styles.emptyBody}>
              Tap the heart on any entry to save it as a Core Memory.
            </Text>
            <View style={styles.emptyButtonWrap}>
              <PrimaryButton
                label="Browse your entries"
                onPress={() => router.back()}
              />
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  // ─── Count Row ────────────────────────
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    gap: spacing(1),
  },
  countText: {
    ...typography.timestamp,
    color: colors.accent,
    fontWeight: '600',
  },
  // ─── Child Tabs ────────────────────────
  tabScroll: {
    flexGrow: 0,
  },
  tabRow: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(4),
    gap: spacing(2),
    alignItems: 'center',
  },
  // ─── Entry List ────────────────────────
  list: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(8),
    flexGrow: 1,
  },
  // ─── Empty State ───────────────────────
  empty: {
    alignItems: 'center',
    paddingTop: spacing(16),
    gap: spacing(3),
    paddingHorizontal: spacing(4),
  },
  emptyHeading: {
    ...typography.sectionHeading,
    color: colors.text,
    textAlign: 'center',
  },
  emptyBody: {
    ...typography.formLabel,
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 21,
  },
  emptyButtonWrap: {
    width: '100%',
    paddingHorizontal: spacing(4),
    marginTop: spacing(4),
  },
});
