import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii, shadows, childColors } from '@/constants/theme';
import { useChildrenStore } from '@/stores/childrenStore';
import { useEntriesStore, mapSupabaseEntry } from '@/stores/entriesStore';
import { useAuthStore } from '@/stores/authStore';
import TopBar from '@/components/TopBar';
import ChildPill from '@/components/ChildPill';
import PrimaryButton from '@/components/PrimaryButton';
import { useLocation } from '@/hooks/useLocation';
import { detectChildren, detectTags } from '@/lib/autoDetect';
import { hasEnoughContent } from '@/lib/textQuality';
import { entriesService } from '@/services/entries.service';
import { tagsService } from '@/services/tags.service';

export default function FirstMemoryTextScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const addEntryLocal = useEntriesStore((s) => s.addEntryLocal);
  const familyId = useAuthStore((s) => s.familyId);
  const { locationText } = useLocation();
  const [text, setText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [fillerMessage, setFillerMessage] = useState(false);

  const firstChild = children[0];
  const childColor = firstChild
    ? childColors[firstChild.colorIndex]?.hex ?? childColors[0].hex
    : childColors[0].hex;

  const handleSave = async () => {
    if (isSaving) return;

    const trimmed = text.trim();

    // Quality gate: don't save entries that are mostly filler words
    if (!hasEnoughContent(trimmed)) {
      setFillerMessage(true);
      setTimeout(() => setFillerMessage(false), 4000);
      return;
    }

    setIsSaving(true);

    try {
      if (!familyId) throw new Error('No family — cannot create entry');

      // Step 1: Create the entry row in Supabase
      const row = await entriesService.create({
        family_id: familyId,
        transcript: trimmed,
        entry_date: new Date().toISOString(),
        entry_type: 'text',
        location_text: locationText || null,
        is_favorited: true,
      });

      // Navigate right away — child/tag linking continues in background
      router.push('/(onboarding)/memory-saved');

      // Step 2 (background): Auto-detect children + tags, link them, add to local store
      (async () => {
        try {
          // Link children
          const detected = detectChildren(trimmed, children);
          const childIds = detected.length > 0 ? detected : (firstChild ? [firstChild.id] : []);
          if (childIds.length > 0) {
            await entriesService.setEntryChildren(row.id, childIds, true);
          }

          // Link tags — find 'first-memory' by slug + keyword-detected tags
          const systemTags = await tagsService.getSystemTags();
          const firstMemoryTag = systemTags.find((t) => t.slug === 'first-memory');
          const detectedTagIds = detectTags(trimmed, systemTags);
          const allTagIds = new Set(detectedTagIds);
          if (firstMemoryTag) allTagIds.add(firstMemoryTag.id);
          if (allTagIds.size > 0) {
            await entriesService.setEntryTags(row.id, [...allTagIds], true);
          }

          // Fetch full entry (with joins) and add to local store
          const fullRow = await entriesService.getEntry(row.id);
          addEntryLocal(mapSupabaseEntry(fullRow));

          // Fire-and-forget AI processing
          entriesService.processWithAI(row.id).catch(() => {});
        } catch (err) {
          console.warn('Background onboarding entry setup failed:', err);
        }
      })();
    } catch (err) {
      // If Supabase save fails, still navigate — don't trap the user in onboarding
      console.error('Failed to save onboarding entry to Supabase:', err);
      router.push('/(onboarding)/memory-saved');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.container}>
        <TopBar showBack />

        {/* Child pill */}
        {firstChild && (
          <View style={styles.pillRow}>
            <ChildPill name={firstChild.name} color={childColor} />
          </View>
        )}

        {/* Text area */}
        <View style={styles.textCard}>
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Start typing your memory..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            autoFocus
            autoCapitalize="sentences"
          />
        </View>

        {/* Filler feedback */}
        {fillerMessage && (
          <Text style={styles.fillerHint}>
            Try adding a bit more detail about this moment!
          </Text>
        )}

        {/* Save button */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(5) }]}>
          <PrimaryButton
            label="Save"
            onPress={handleSave}
            disabled={text.trim().length === 0 || isSaving}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  pillRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing(5),
    marginBottom: spacing(4),
  },
  textCard: {
    flex: 1,
    marginHorizontal: spacing(5),
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    overflow: 'hidden',
    padding: spacing(4),
  },
  textInput: {
    flex: 1,
    ...typography.transcript,
    color: colors.text,
  },
  fillerHint: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: spacing(5),
    marginBottom: spacing(2),
  },
  bottom: {
    padding: spacing(5),
  },
});
