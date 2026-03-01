import { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Animated,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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
  childColors,
  childColorWithOpacity,
  hitSlop,
  minTouchTarget,
} from '@/constants/theme';
import { useEntriesStore } from '@/stores/entriesStore';
import { useChildrenStore, type Child } from '@/stores/childrenStore';
import ChildPill from '@/components/ChildPill';
import TagPill from '@/components/TagPill';
import PaperTexture from '@/components/PaperTexture';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import { useLocationPermission } from '@/hooks/useLocation';

// ─── FadeInUp Wrapper ────────────────────────────────────

/**
 * Wraps children in a subtle slide-up + fade-in entrance.
 * Think of a card sliding up from just below where it sits —
 * it only moves 10px, so it feels snappy, not dramatic.
 */
function FadeInUp({ children, skip }: { children: React.ReactNode; skip: boolean }) {
  const opacity = useRef(new Animated.Value(skip ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(skip ? 0 : 10)).current;

  useEffect(() => {
    if (skip) return;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}

// ─── Frequent Tags ────────────────────────────────────────

const FREQUENT_TAGS = [
  'funny', 'milestone', 'first', 'sweet',
  'bedtime', 'outing', 'words', 'siblings',
];

// ─── Helpers ──────────────────────────────────────────────

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getAge(birthday: string, entryDate: string): string {
  const b = new Date(birthday);
  const d = new Date(entryDate);
  let years = d.getFullYear() - b.getFullYear();
  let months = d.getMonth() - b.getMonth();
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 1) return `${months}m`;
  if (months === 0) return `${years}y`;
  return `${years}y ${months}m`;
}

// ─── Entry Detail Screen ──────────────────────────────────

export default function EntryDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const allChildren = useChildrenStore((s) => s.children);
  const entries = useEntriesStore((s) => s.entries);
  const toggleFavorite = useEntriesStore((s) => s.toggleFavorite);
  const deleteEntry = useEntriesStore((s) => s.deleteEntry);
  const updateEntry = useEntriesStore((s) => s.updateEntry);

  // Get the most recent non-deleted entry as the one to display
  const entry = useMemo(
    () => entries.find((e) => !e.isDeleted) ?? null,
    [entries],
  );

  // Location — lightweight check, no GPS (just permission status)
  const permissionGranted = useLocationPermission();
  const [editingLocation, setEditingLocation] = useState(false);
  const [locationInput, setLocationInput] = useState(entry?.locationText ?? '');

  // Local state
  const [transcript, setTranscript] = useState(entry?.text ?? '');
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [saveIndicator, setSaveIndicator] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  // Banner auto-dismiss (built-in Animated, not Reanimated)
  const bannerOpacity = useRef(new Animated.Value(1)).current;
  const reduceMotion = useReduceMotion();
  useEffect(() => {
    if (showBanner && entry?.hasAudio) {
      const timer = setTimeout(() => {
        if (reduceMotion) {
          bannerOpacity.setValue(0);
          setShowBanner(false);
        } else {
          Animated.timing(bannerOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }).start(() => setShowBanner(false));
        }
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showBanner, entry]);

  // Sync transcript when entry changes
  useEffect(() => {
    if (entry) setTranscript(entry.text);
  }, [entry?.id]);

  // Sync location input when entry changes
  useEffect(() => {
    if (entry) setLocationInput(entry.locationText ?? '');
  }, [entry?.id]);

  if (!entry) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Ionicons name="document-text-outline" size={48} color={colors.textMuted} />
        <Text style={styles.emptyText}>No entry to display</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // Derived data
  const entryChildren = entry.childIds
    .map((id) => allChildren.find((c) => c.id === id))
    .filter(Boolean) as Child[];
  const untaggedChildren = allChildren.filter(
    (c) => !entry.childIds.includes(c.id),
  );
  const allChildrenTagged = untaggedChildren.length === 0;

  // Handlers
  const handleTranscriptChange = (text: string) => {
    setTranscript(text);
    updateEntry(entry.id, { text });
    setSaveIndicator(true);
    setTimeout(() => setSaveIndicator(false), 2000);
  };

  const handleAddChildToEntry = (childId: string) => {
    const newIds = [...entry.childIds, childId];
    updateEntry(entry.id, { childIds: newIds });
  };

  const handleRemoveChildFromEntry = (childId: string) => {
    if (entry.childIds.length <= 1) {
      setShowChildPicker(true);
      return;
    }
    const newIds = entry.childIds.filter((id) => id !== childId);
    updateEntry(entry.id, { childIds: newIds });
  };

  const handleToggleChildInPicker = (childId: string) => {
    if (entry.childIds.includes(childId)) {
      if (entry.childIds.length > 1) {
        handleRemoveChildFromEntry(childId);
      }
    } else {
      handleAddChildToEntry(childId);
    }
  };

  const handleAddTag = (tag: string) => {
    const trimmed = tag.trim().toLowerCase();
    if (!trimmed || entry.tags.includes(trimmed)) return;
    updateEntry(entry.id, { tags: [...entry.tags, trimmed] });
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    updateEntry(entry.id, { tags: entry.tags.filter((t) => t !== tag) });
  };

  const handleDelete = () => {
    deleteEntry(entry.id);
    setShowDeleteDialog(false);
    router.back();
  };

  // Age line
  const ageLine = entryChildren
    .map((c) => `${c.name} ${getAge(c.birthday, entry.date)}`)
    .join(' · ');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing(3) }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={hitSlop.icon}
          style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={styles.topBarRight}>
          <Pressable
            onPress={() => toggleFavorite(entry.id)}
            hitSlop={hitSlop.icon}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons
              name={entry.isFavorited ? 'heart' : 'heart-outline'}
              size={22}
              color={entry.isFavorited ? colors.heartFilled : colors.text}
            />
          </Pressable>
          <Pressable
            onPress={() => setShowDeleteDialog(true)}
            hitSlop={hitSlop.icon}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="trash-outline" size={20} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + spacing(10) }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Post-recording banner */}
        {showBanner && entry.hasAudio && (
          <Animated.View style={[styles.banner, { opacity: bannerOpacity }]}>
            <Ionicons name="heart" size={16} color={colors.accent} />
            <Text style={styles.bannerText}>Memory saved</Text>
          </Animated.View>
        )}

        {/* Line 1: Date + time */}
        <View style={styles.dateLine}>
          <Text style={styles.dateText}>{formatDate(entry.date)}</Text>
          <Text style={styles.timeText}>{formatTime(entry.date)}</Text>
        </View>

        {/* Line 2: Location
             - Permission granted + has location → show, tappable to edit
             - Permission granted + no location → show "Add location" placeholder
             - Permission revoked + has location → show read-only (data still visible)
             - Permission revoked + no location → hide entirely (no wasted space) */}
        {(permissionGranted || entry.locationText) && (
          <>
            <Pressable
              onPress={permissionGranted ? () => setEditingLocation(true) : undefined}
              disabled={!permissionGranted}
              style={styles.locationLine}
              hitSlop={hitSlop.icon}
            >
              <Ionicons
                name="location-outline"
                size={14}
                color={colors.textMuted}
              />
              <Text style={styles.locationText}>
                {entry.locationText || 'Add location'}
              </Text>
            </Pressable>

            {editingLocation && permissionGranted && (
              <FadeInUp skip={reduceMotion}>
                <View style={styles.locationEditorCard}>
                  <TextInput
                    style={styles.locationInput}
                    value={locationInput}
                    onChangeText={setLocationInput}
                    placeholder="Enter a location..."
                    placeholderTextColor={colors.textMuted}
                    onSubmitEditing={() => {
                      updateEntry(entry.id, {
                        locationText: locationInput.trim() || undefined,
                      });
                      setEditingLocation(false);
                    }}
                    returnKeyType="done"
                    autoFocus
                  />
                  <View style={styles.locationActions}>
                    <Pressable
                      onPress={() => {
                        setLocationInput('');
                        updateEntry(entry.id, { locationText: undefined });
                        setEditingLocation(false);
                      }}
                      style={styles.locationClearBtn}
                    >
                      <Text style={styles.locationClearText}>Clear</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        updateEntry(entry.id, {
                          locationText: locationInput.trim() || undefined,
                        });
                        setEditingLocation(false);
                      }}
                      style={styles.locationDoneBtn}
                    >
                      <Text style={styles.locationDoneText}>Done</Text>
                    </Pressable>
                  </View>
                </View>
              </FadeInUp>
            )}
          </>
        )}

        {/* Line 3: Child pills + add button */}
        <View style={styles.childLine}>
          {entryChildren.map((child) => (
            <ChildPill
              key={child.id}
              name={child.name}
              color={childColors[child.colorIndex]?.hex ?? childColors[0].hex}
              showRemove
              onRemove={() => handleRemoveChildFromEntry(child.id)}
            />
          ))}
          {!allChildrenTagged && (
            <Pressable
              onPress={() => setShowChildPicker(!showChildPicker)}
              hitSlop={hitSlop.icon}
              style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="add" size={18} color={colors.accent} />
            </Pressable>
          )}
        </View>

        {/* Line 3: Age line */}
        {ageLine.length > 0 && (
          <Text style={styles.ageLine}>{ageLine}</Text>
        )}

        {/* Child Picker */}
        {showChildPicker && (
          <FadeInUp skip={reduceMotion}>
            <View style={styles.pickerCard}>
              {allChildren.map((child) => {
                const isSelected = entry.childIds.includes(child.id);
                const hex = childColors[child.colorIndex]?.hex ?? childColors[0].hex;
                return (
                  <Pressable
                    key={child.id}
                    onPress={() => handleToggleChildInPicker(child.id)}
                    style={[
                      styles.pickerPill,
                      {
                        borderColor: isSelected ? hex : colors.border,
                        backgroundColor: isSelected
                          ? childColorWithOpacity(hex, 0.12)
                          : colors.card,
                      },
                    ]}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={14} color={hex} />
                    )}
                    <Text
                      style={[
                        styles.pickerPillText,
                        { color: isSelected ? hex : colors.textMuted },
                      ]}
                    >
                      {child.name}
                    </Text>
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => setShowChildPicker(false)}
                style={styles.pickerDone}
              >
                <Text style={styles.pickerDoneText}>Done</Text>
              </Pressable>
            </View>
          </FadeInUp>
        )}

        {/* Tags Row */}
        <View style={styles.tagsRow}>
          {entry.tags.map((tag) => (
            <TagPill
              key={tag}
              label={tag}
              onRemove={() => handleRemoveTag(tag)}
            />
          ))}
          <Pressable onPress={() => setShowTagEditor(!showTagEditor)}>
            <Text style={styles.addTagLink}>+ add</Text>
          </Pressable>
        </View>

        {/* Tag Editor */}
        {showTagEditor && (
          <FadeInUp skip={reduceMotion}>
            <View style={styles.tagEditorCard}>
              <TextInput
                style={styles.tagInput}
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Add a tag..."
                placeholderTextColor={colors.textMuted}
                onSubmitEditing={() => handleAddTag(tagInput)}
                returnKeyType="done"
              />
              <Text style={styles.frequentLabel}>Your Frequent Tags</Text>
              <View style={styles.frequentRow}>
                {FREQUENT_TAGS.map((tag) => {
                  const isAdded = entry.tags.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() =>
                        isAdded ? handleRemoveTag(tag) : handleAddTag(tag)
                      }
                      style={[
                        styles.frequentPill,
                        isAdded && styles.frequentPillActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.frequentPillText,
                          isAdded && styles.frequentPillTextActive,
                        ]}
                      >
                        {tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </FadeInUp>
        )}

        {/* Transcript Area */}
        <View style={styles.transcriptCard}>
          <PaperTexture />
          <TextInput
            style={styles.transcriptInput}
            value={transcript}
            onChangeText={handleTranscriptChange}
            placeholder="Start typing your memory..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
          />
        </View>
        {saveIndicator && (
          <Text style={styles.savedIndicator}>All changes saved</Text>
        )}

        {/* Audio Playback Bar */}
        {entry.hasAudio && (
          <View style={styles.audioBar}>
            <Pressable style={styles.playBtn}>
              <Ionicons name="play" size={16} color={colors.accent} />
            </Pressable>
            <View style={styles.scrubTrack}>
              <View style={styles.scrubFill} />
            </View>
            <Text style={styles.audioDuration}>0:42</Text>
          </View>
        )}
      </ScrollView>

      {/* Delete confirmation */}
      <ConfirmationDialog
        visible={showDeleteDialog}
        title="Delete this memory?"
        body="Deleted entries can be recovered for 30 days."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(3),
  },
  emptyText: {
    ...typography.formLabel,
    color: colors.textMuted,
  },
  backLink: {
    ...typography.formLabel,
    color: colors.accent,
  },
  // ─── Top Bar ────────────────────────
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  topBarRight: {
    flexDirection: 'row',
    gap: spacing(3),
  },
  iconBtn: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ─── Scroll ─────────────────────────
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(10),
  },
  // ─── Banner ─────────────────────────
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    backgroundColor: colors.accentSoft,
    padding: spacing(3),
    borderRadius: radii.md,
    marginBottom: spacing(4),
  },
  bannerText: {
    ...typography.formLabel,
    color: colors.accent,
    fontWeight: '600',
  },
  // ─── Metadata ───────────────────────
  dateLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing(2),
    marginBottom: spacing(3),
  },
  dateText: {
    ...typography.formLabel,
    fontWeight: '700',
    color: colors.text,
  },
  timeText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  // ─── Location ─────────────────────
  locationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    marginBottom: spacing(3),
    minHeight: minTouchTarget,
  },
  locationText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  locationEditorCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  locationInput: {
    ...typography.formLabel,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing(2),
  },
  locationActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing(3),
    marginTop: spacing(2),
  },
  locationClearBtn: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationClearText: {
    ...typography.formLabel,
    color: colors.textMuted,
  },
  locationDoneBtn: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationDoneText: {
    ...typography.formLabel,
    color: colors.accent,
  },
  childLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(2),
  },
  addBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
  },
  ageLine: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing(4),
  },
  // ─── Child Picker ───────────────────
  pickerCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing(3),
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginBottom: spacing(4),
  },
  pickerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
    borderRadius: radii.pill,
    borderWidth: 1.5,
  },
  pickerPillText: {
    ...typography.pillLabel,
  },
  pickerDone: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(3),
  },
  pickerDoneText: {
    ...typography.formLabel,
    color: colors.accent,
  },
  // ─── Tags ───────────────────────────
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(4),
  },
  addTagLink: {
    ...typography.caption,
    color: colors.accent,
  },
  // ─── Tag Editor ─────────────────────
  tagEditorCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing(3),
    marginBottom: spacing(4),
  },
  tagInput: {
    ...typography.formLabel,
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing(2),
    marginBottom: spacing(3),
  },
  frequentLabel: {
    ...typography.timestamp,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(2),
  },
  frequentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
  },
  frequentPill: {
    backgroundColor: colors.tag,
    paddingVertical: 4,
    paddingHorizontal: spacing(2),
    borderRadius: radii.sm,
  },
  frequentPillActive: {
    backgroundColor: colors.accentSoft,
  },
  frequentPillText: {
    ...typography.tag,
    color: colors.textSoft,
  },
  frequentPillTextActive: {
    color: colors.accent,
  },
  // ─── Transcript ─────────────────────
  transcriptCard: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    overflow: 'hidden',
    padding: spacing(4),
    minHeight: 200,
    marginBottom: spacing(2),
  },
  transcriptInput: {
    ...typography.transcript,
    color: colors.text,
    minHeight: 180,
  },
  savedIndicator: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing(4),
  },
  // ─── Audio Bar ──────────────────────
  audioBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: colors.card,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(3),
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrubTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  scrubFill: {
    width: '35%',
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  audioDuration: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
