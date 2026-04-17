import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
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
import { useChildrenStore } from '@/stores/childrenStore';
import { useEntriesStore } from '@/stores/entriesStore';
import { buildChildMap, entryToCard, getFirstEntryBadges } from '@/lib/entryHelpers';
import TopBar from '@/components/TopBar';
import ChildTab from '@/components/ChildTab';
import EntryCard from '@/components/EntryCard';
import PrimaryButton from '@/components/PrimaryButton';
import FloatingFireflies from '@/components/FloatingFireflies';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { storageService } from '@/services/storage.service';
import { capture } from '@/lib/posthog';

// ─── Favorites Tab (Firefly Jar) ─────────────────────────
//
// Shows all favorited entries with the warm gold gradient
// and floating fireflies. Moved from a pushed screen into
// the Favorites tab — no subscription gate, no back button.

export default function FavoritesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const entries = useEntriesStore((s) => s.entries);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  useEffect(() => { capture('firefly_jar_viewed'); }, []);

  // ─── Single shared audio player ─────────────────────────
  const player = useAudioPlayer();
  const [playingEntryId, setPlayingEntryId] = useState<string | null>(null);
  const navigation = useNavigation();

  // Stop audio when leaving this tab (switching tabs or pushing a screen)
  useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      player.cleanup();
      setPlayingEntryId(null);
    });
    return unsubscribe;
  }, [navigation, player]);

  const handlePlayAudio = useCallback(async (entryId: string, audioStoragePath?: string) => {
    if (!audioStoragePath) return;

    // Same entry — toggle play/pause
    if (playingEntryId === entryId) {
      if (player.isPlaying) {
        player.pause();
      } else {
        player.play();
      }
      return;
    }

    // Different entry — load new audio
    try {
      setPlayingEntryId(entryId);
      const url = await storageService.getPlaybackUrl(audioStoragePath);
      await player.load(url);
      await player.play();
    } catch (err) {
      console.warn('Failed to play audio:', err);
      setPlayingEntryId(null);
    }
  }, [playingEntryId, player]);

  // Build child lookup
  const childMap = useMemo(() => buildChildMap(children), [children]);

  // All non-deleted entries — used for "first memory" badge calculation
  const allActiveEntries = useMemo(
    () => entries.filter((e) => !e.isDeleted),
    [entries],
  );

  const firstMemoryBadges = useMemo(
    () => getFirstEntryBadges(allActiveEntries, childMap),
    [allActiveEntries, childMap],
  );

  // All favorited, non-deleted entries (newest first)
  const favorites = useMemo(
    () => entries.filter((e) => e.isFavorited && !e.isDeleted),
    [entries],
  );

  // Filtered by child tab
  const filteredMemories = useMemo(() => {
    if (!activeFilter) return favorites;
    return favorites.filter((e) => e.childIds.includes(activeFilter));
  }, [favorites, activeFilter]);

  const isMultiChild = children.length >= 2;

  return (
    <View style={styles.container}>
      {/* Warm honey fades to cool cream in the bottom third */}
      <LinearGradient
        colors={[screenColors.fireflyJarBg, colors.bg]}
        locations={[0.33, 1]}
        style={styles.gradientBottom}
      />

      {/* Floating firefly particles */}
      <View style={styles.firefliesLayer} pointerEvents="none">
        <FloatingFireflies />
      </View>

      {/* Top bar — sans-serif title, no back button */}
      <TopBar title="Your Firefly Jar" />

      {/* Memory count */}
      <View style={styles.countRow}>
        <Ionicons name="heart" size={14} color={colors.heartFilled} />
        <Text style={styles.countText}>
          {favorites.length}{' '}
          {favorites.length === 1 ? 'memory' : 'memories'} saved
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

      {/* Entry list */}
      <FlatList
        data={filteredMemories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing(8) }]}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <EntryCard
            entry={entryToCard(item, childMap, 'short', firstMemoryBadges)}
            variant="coreMemory"
            index={index}
            onPress={() => router.push({ pathname: '/(main)/entry-detail', params: { entryId: item.id } })}
            isPlaying={playingEntryId === item.id && player.isPlaying}
            onPlayAudio={() => handlePlayAudio(item.id, item.audioStoragePath)}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="heart-outline" size={48} color={colors.heartEmpty} />
            <Text style={styles.emptyHeading}>No fireflies yet</Text>
            <Text style={styles.emptyBody}>
              Tap the heart on any entry to catch it in your Firefly Jar.
            </Text>
            <View style={styles.emptyButtonWrap}>
              <PrimaryButton
                label="Browse your entries"
                onPress={() => router.push('/(main)/(tabs)/journal')}
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
    backgroundColor: screenColors.fireflyJarBg,
  },
  gradientBottom: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  firefliesLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 600,
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
