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
import { useEntriesStore } from '@/stores/entriesStore';
import TopBar from '@/components/TopBar';
import ChildPill from '@/components/ChildPill';
import PrimaryButton from '@/components/PrimaryButton';
import PaperTexture from '@/components/PaperTexture';
import { useLocation } from '@/hooks/useLocation';

export default function FirstMemoryTextScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const addEntry = useEntriesStore((s) => s.addEntry);
  const { locationText } = useLocation();
  const [text, setText] = useState('');

  const firstChild = children[0];
  const childColor = firstChild
    ? childColors[firstChild.colorIndex]?.hex ?? childColors[0].hex
    : childColors[0].hex;

  const handleSave = () => {
    addEntry({
      text: text.trim(),
      date: new Date().toISOString(),
      childIds: firstChild ? [firstChild.id] : [],
      tags: ['first-memory'],
      isFavorited: true,
      hasAudio: false,
      locationText: locationText ?? undefined,
    });
    router.push('/(onboarding)/memory-saved');
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
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
          <PaperTexture />
          <TextInput
            style={styles.textInput}
            value={text}
            onChangeText={setText}
            placeholder="Start typing your memory..."
            placeholderTextColor={colors.textMuted}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        </View>

        {/* Save button */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(5) }]}>
          <PrimaryButton
            label="Save"
            onPress={handleSave}
            disabled={text.trim().length === 0}
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
  bottom: {
    padding: spacing(5),
  },
});
