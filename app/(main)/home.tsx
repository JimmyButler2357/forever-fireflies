import { useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  childColors,
  childColorWithOpacity,
} from '@/constants/theme';
import { useChildrenStore, type Child } from '@/stores/childrenStore';
import { useEntriesStore, type Entry } from '@/stores/entriesStore';
import { useUIStore } from '@/stores/uiStore';
import { SEED_CHILDREN, SEED_ENTRIES } from '@/constants/seedData';
import TopBar from '@/components/TopBar';
import ChildTab from '@/components/ChildTab';
import EntryCard from '@/components/EntryCard';

// ─── Helpers ──────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getAge(birthday: string): string {
  const b = new Date(birthday);
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  let months = now.getMonth() - b.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 1) return `${months}mo`;
  if (months === 0) return `${years}y`;
  return `${years}y ${months}m`;
}

// ─── Search Pill ─────────────────────────────────────────

function SearchPill({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.searchPill,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons name="search-outline" size={14} color={colors.textMuted} />
      <Text style={styles.searchPillText}>Search</Text>
    </Pressable>
  );
}

// ─── Home Screen ──────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const entries = useEntriesStore((s) => s.entries);
  const activeFilter = useUIStore((s) => s.activeChildFilter);
  const setFilter = useUIStore((s) => s.setActiveChildFilter);

  // One-time cleanup: wipe old numeric-ID data from before the uid() fix,
  // then seed fresh data for development.
  useEffect(() => {
    const hasOldIds = children.some((c) => /^\d+$/.test(c.id));
    if (hasOldIds) {
      // Clear stale data that used the old counter-based IDs
      useChildrenStore.setState({ children: [] });
      useEntriesStore.setState({ entries: [] });
    }

    const currentChildren = useChildrenStore.getState().children;
    const currentEntries = useEntriesStore.getState().entries;

    if (currentChildren.length === 0) {
      const addChild = useChildrenStore.getState().addChild;
      SEED_CHILDREN.forEach((c) => addChild({ name: c.name, birthday: c.birthday }));
    }
    if (currentEntries.length === 0) {
      const store = useEntriesStore.getState();
      SEED_ENTRIES.forEach((e) => {
        const { id, ...rest } = e;
        store.addEntry(rest);
      });
    }
  }, []);

  // Active (non-deleted) entries, reverse chronological
  const activeEntries = useMemo(
    () => entries.filter((e) => !e.isDeleted),
    [entries],
  );

  // Filtered entries by child tab
  const filteredEntries = useMemo(() => {
    if (!activeFilter) return activeEntries;
    return activeEntries.filter((e) => e.childIds.includes(activeFilter));
  }, [activeEntries, activeFilter]);

  const isMultiChild = children.length >= 2;
  const isSingleChild = children.length === 1;
  const isFirstEntry = activeEntries.length === 1;

  // Build child lookup for fast access
  const childMap = useMemo(() => {
    const map: Record<string, Child> = {};
    children.forEach((c) => (map[c.id] = c));
    return map;
  }, [children]);

  // Map an Entry to EntryCard's display format
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

  const childColor = childColors[children[0]?.colorIndex ?? 0]?.hex ?? childColors[0].hex;

  return (
    <View style={styles.container}>
      {/* Top bar */}
      <TopBar
        title="Core Memories"
        titleStyle="serif"
        rightContent={
          !isFirstEntry ? (
            <SearchPill onPress={() => router.push('/(main)/search')} />
          ) : undefined
        }
        rightIcons={
          isFirstEntry
            ? [{ icon: 'settings-outline' as const, onPress: () => router.push('/(main)/settings') }]
            : [
                { icon: 'heart-outline' as const, onPress: () => router.push('/(main)/core-memories') },
                { icon: 'settings-outline' as const, onPress: () => router.push('/(main)/settings') },
              ]
        }
      />

      {/* First-entry celebration banner */}
      {isFirstEntry && (
        <View style={styles.banner}>
          <Text style={styles.bannerEmoji}>✨</Text>
          <Text style={styles.bannerTitle}>Your first memory is saved</Text>
          <Text style={styles.bannerBody}>
            This is where all your memories will live. Record another one anytime.
          </Text>
        </View>
      )}

      {/* Child tabs — multi-child only */}
      {isMultiChild && !isFirstEntry && (
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
            onPress={() => setFilter(null)}
            showDot={false}
          />
          {children.map((child) => (
            <ChildTab
              key={child.id}
              label={child.name}
              color={childColors[child.colorIndex]?.hex ?? childColors[0].hex}
              active={activeFilter === child.id}
              onPress={() => setFilter(child.id)}
            />
          ))}
        </ScrollView>
      )}

      {/* Single child info pill — pill has dot + name; age + count sit outside */}
      {isSingleChild && !isFirstEntry && (
        <View style={styles.singleChildRow}>
          <View
            style={[
              styles.singleChildPill,
              {
                backgroundColor: childColorWithOpacity(childColor, 0.12),
                borderColor: childColor,
                shadowColor: childColor,
              },
            ]}
          >
            <View
              style={[
                styles.singleChildDot,
                { backgroundColor: childColor },
              ]}
            />
            <Text
              style={[
                styles.singleChildName,
                { color: childColor },
              ]}
            >
              {children[0].name}
            </Text>
          </View>
          <Text style={styles.singleChildAge}>
            {getAge(children[0].birthday)}
          </Text>
          <Text style={styles.singleChildSep}>{'\u00B7'}</Text>
          <Text style={styles.singleChildCount}>
            {activeEntries.length} {activeEntries.length === 1 ? 'memory' : 'memories'}
          </Text>
        </View>
      )}

      {/* Entry list */}
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        style={styles.listContainer}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <EntryCard
            entry={entryToCard(item)}
            index={index}
            onPress={() => router.push('/(main)/entry-detail')}
            showTags={false}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="book-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyHeading}>No memories yet</Text>
            <Text style={styles.emptyBody}>
              Tap the mic button to record your first memory.
            </Text>
          </View>
        }
      />

      {/* Bottom gradient fade */}
      <LinearGradient
        colors={['transparent', 'rgba(250,248,245,0.55)', colors.bg]}
        locations={[0, 0.55, 1]}
        style={styles.bottomFade}
        pointerEvents="none"
      />

      {/* Bottom action area */}
      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + spacing(8) }]}>
        {/* Simple mic button — no Reanimated */}
        <Pressable
          onPress={() => router.push('/(main)/recording')}
          style={({ pressed }) => [
            styles.micButton,
            pressed && { opacity: 0.85 },
          ]}
        >
          <Ionicons name="mic" size={28} color={colors.card} />
        </Pressable>

        <Pressable
          onPress={() => router.push('/(main)/entry-detail')}
          style={styles.writeLink}
        >
          <Ionicons name="pencil-outline" size={12} color={colors.textSoft} />
          <Text style={styles.writeLinkText}>or write instead</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  // ─── Search Pill ──────────────────
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.tag,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  searchPillText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
  },
  // ─── Banner ────────────────────────
  banner: {
    marginHorizontal: spacing(5),
    marginBottom: spacing(4),
    padding: spacing(4),
    backgroundColor: colors.accentSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: childColorWithOpacity('#E8724A', 0.15),
    alignItems: 'center',
  },
  bannerEmoji: {
    fontSize: 24,
    marginBottom: spacing(2),
  },
  bannerTitle: {
    ...typography.formLabel,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing(1),
  },
  bannerBody: {
    ...typography.caption,
    color: colors.textSoft,
    textAlign: 'center',
  },
  // ─── Child Tabs ────────────────────
  tabScroll: {
    flexGrow: 0,
  },
  tabRow: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    gap: spacing(2),
    alignItems: 'center',
  },
  // ─── Single Child Pill ─────────────
  singleChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
    gap: spacing(2),
  },
  singleChildPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radii.pill,
    borderWidth: 2,
    gap: spacing(2),
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 2,
  },
  singleChildDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  singleChildName: {
    ...typography.pillLabel,
  },
  singleChildAge: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  singleChildSep: {
    fontSize: 12,
    color: colors.textMuted,
  },
  singleChildCount: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textMuted,
  },
  // ─── Entry List ────────────────────
  listContainer: {
    flex: 1,
  },
  list: {
    flexGrow: 1,
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(40), // room for bottom area
  },
  // ─── Empty State ───────────────────
  empty: {
    alignItems: 'center',
    paddingTop: spacing(16),
    gap: spacing(3),
  },
  emptyHeading: {
    ...typography.sectionHeading,
    color: colors.text,
  },
  emptyBody: {
    ...typography.formLabel,
    color: colors.textSoft,
    textAlign: 'center',
  },
  // ─── Bottom Area ───────────────────
  bottomFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: spacing(8),
    gap: spacing(2),
  },
  micButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 4,
  },
  writeLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  writeLinkText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSoft,
  },
});
