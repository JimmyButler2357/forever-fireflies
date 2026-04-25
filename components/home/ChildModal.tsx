import { useMemo } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import {
  colors,
  spacing,
  radii,
  shadows,
  fonts,
  childColors,
  childColorWithOpacity,
} from '@/constants/theme';
import { getAge } from '@/lib/dateUtils';
import { formatDate } from '@/lib/dateUtils';
import { useUIStore } from '@/stores/uiStore';
import type { Child } from '@/stores/childrenStore';
import type { Entry } from '@/stores/entriesStore';
import type { PhotoState } from '@/lib/photoUrlCache';

/**
 * Modal overlay showing detailed stats for a single child.
 *
 * Displays: larger avatar, full age, memory/favorite/first-memory
 * stats, most recent entry, and a "See all memories" link that
 * switches to the Journal tab with that child's filter applied.
 */

interface ChildModalProps {
  visible: boolean;
  onClose: () => void;
  childId: string | null;
  children: Child[];
  entries: Entry[];
  photoStates?: Record<string, PhotoState>;
}

export default function ChildModal({
  visible,
  onClose,
  childId,
  children,
  entries,
  photoStates = {},
}: ChildModalProps) {
  const router = useRouter();

  const child = useMemo(
    () => children.find((c) => c.id === childId) ?? null,
    [children, childId],
  );

  const stats = useMemo(() => {
    if (!childId) return { memories: 0, favorites: 0, firstMemoryTitle: null, recentEntry: null };

    const childEntries = entries
      .filter((e) => !e.isDeleted && e.childIds.includes(childId))
      .sort((a, b) => a.date.localeCompare(b.date));

    const favorites = childEntries.filter((e) => e.isFavorited).length;
    const firstMemoryTitle = childEntries[0]?.title ?? null;

    // Most recent = last in chronological order
    const recentEntry = childEntries.length > 0
      ? childEntries[childEntries.length - 1]
      : null;

    return {
      memories: childEntries.length,
      favorites,
      firstMemoryTitle,
      recentEntry,
    };
  }, [entries, childId]);

  if (!child) return null;

  const hex = childColors[child.colorIndex]?.hex ?? childColors[0].hex;

  const handleSeeAll = () => {
    useUIStore.getState().setActiveChildFilter(child.id);
    onClose();
    // Small delay so the modal dismisses before navigating
    setTimeout(() => {
      router.navigate('/(main)/(tabs)/journal' as any);
    }, 100);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          {/* Avatar */}
          <View
            style={[
              styles.avatar,
              {
                borderColor: hex,
                backgroundColor: childColorWithOpacity(hex, 0.12),
              },
            ]}
          >
            {(() => {
              const state: PhotoState = photoStates[child.id] ?? { status: 'none' };
              if (state.status === 'loaded') {
                return <Image source={{ uri: state.url }} style={styles.avatarImage} />;
              }
              if (state.status === 'loading') {
                return <ActivityIndicator size="small" color={hex} />;
              }
              return (
                <Text style={[styles.avatarLetter, { color: hex }]}>
                  {child.name[0]}
                </Text>
              );
            })()}
          </View>

          {/* Name + age */}
          <Text style={styles.name}>{child.name}</Text>
          <Text style={styles.age}>{getAge(child.birthday)}</Text>

          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{stats.memories}</Text>
              <Text style={styles.statLabel}>Memories</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statNumber}>{stats.favorites}</Text>
              <Text style={styles.statLabel}>Favorites</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statNumber, styles.statNumberSmall]} numberOfLines={1}>
                {stats.firstMemoryTitle ?? '—'}
              </Text>
              <Text style={styles.statLabel}>First memory</Text>
            </View>
          </View>

          {/* Most recent entry */}
          {stats.recentEntry && (
            <View style={styles.recentCard}>
              <Text style={styles.recentTitle} numberOfLines={1}>
                {stats.recentEntry.title ?? 'Untitled'}
              </Text>
              <Text style={styles.recentDate}>
                {formatDate(stats.recentEntry.date, 'long')}
              </Text>
            </View>
          )}

          {/* See all link */}
          <Pressable
            onPress={handleSeeAll}
            style={({ pressed }) => [pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.seeAll}>See all memories ›</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const AVATAR_SIZE = 72;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: 300,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(6),
    alignItems: 'center',
    ...shadows.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(3),
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLetter: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
  },
  name: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.text,
  },
  age: {
    fontSize: 14,
    color: colors.textSoft,
    marginTop: spacing(1),
    marginBottom: spacing(5),
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: spacing(5),
  },
  stat: {
    alignItems: 'center',
    flex: 1,
    gap: spacing(1),
  },
  statNumber: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    color: colors.text,
  },
  statNumberSmall: {
    fontSize: 14,
    maxWidth: 80,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: colors.textMuted,
  },
  recentCard: {
    width: '100%',
    backgroundColor: colors.bg,
    borderRadius: radii.sm,
    padding: spacing(3),
    marginBottom: spacing(4),
    gap: spacing(1),
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  recentDate: {
    fontSize: 11,
    color: colors.textMuted,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
});
