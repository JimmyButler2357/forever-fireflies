import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  colors,
  fonts,
  typography,
  spacing,
  radii,
  shadows,
  childColors,
} from '@/constants/theme';
import { useChildrenStore } from '@/stores/childrenStore';
import PrimaryButton from '@/components/PrimaryButton';
import ChildPill from '@/components/ChildPill';
import PaperTexture from '@/components/PaperTexture';
import BirthdayPicker, { formatBirthdayDisplay } from '@/components/BirthdayPicker';

// ─── Add Child Screen ─────────────────────────────────────

export default function AddChildScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { children, addChild, removeChild } = useChildrenStore();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthday, setBirthday] = useState('');

  const hasChildren = children.length > 0;
  const nameEntered = name.trim().length > 0;
  const birthdaySet = !!birthday;
  const formReady = nameEntered && birthdaySet;

  // Dynamic heading
  const heading = hasChildren
    ? 'Anyone else?'
    : nameEntered
      ? `Let's start ${name.trim()}'s memory book.`
      : 'Who are we remembering?';

  // Button label
  const getButtonLabel = () => {
    if (!nameEntered) return 'Enter a name to continue';
    if (!birthdaySet) return 'Add a birthday to continue';
    if (hasChildren) return `Add ${name.trim()} & continue`;
    return `Add ${name.trim()}`;
  };

  const handleAddChild = () => {
    if (!formReady) return;
    addChild({
      name: name.trim(),
      birthday,
      nickname: nickname.trim() || undefined,
    });
    // Reset form for potential next child
    setName('');
    setNickname('');
    setBirthday('');
  };

  const handleContinue = () => {
    if (formReady) {
      // Add this child then continue
      addChild({
        name: name.trim(),
        birthday,
        nickname: nickname.trim() || undefined,
      });
    }
    router.push('/(onboarding)/mic-permission');
  };

  const handleButtonPress = () => {
    if (!formReady) return;
    if (hasChildren) {
      // "Add [name] & continue" — add the child and move on
      handleContinue();
    } else {
      // "Add [name]" — add first child, form resets, heading changes to "Anyone else?"
      handleAddChild();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing(8), paddingBottom: insets.bottom + spacing(5) }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading */}
        <Text style={styles.heading}>{heading}</Text>

        {/* Existing children pills */}
        {hasChildren && (
          <View style={styles.pillRow}>
            {children.map((child) => {
              const color = childColors[child.colorIndex]?.hex ?? childColors[0].hex;
              return (
                <ChildPill
                  key={child.id}
                  name={`${child.name} · ${formatBirthdayDisplay(child.birthday)}`}
                  color={color}
                  showRemove
                  onRemove={() => removeChild(child.id)}
                />
              );
            })}
          </View>
        )}

        {/* Form card */}
        <View style={styles.card}>
          <PaperTexture />

          {/* Name field */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="Child's name"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.fieldDivider} />
          </View>

          {/* Birthday field */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Birthday</Text>
            <BirthdayPicker
              value={birthday || undefined}
              onChange={setBirthday}
            />
            <View style={styles.fieldDivider} />
          </View>

          {/* Nickname field */}
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Nickname (optional)</Text>
            <TextInput
              style={styles.nicknameInput}
              value={nickname}
              onChangeText={setNickname}
              placeholder="Used for voice auto-detection"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        {/* Primary button */}
        <View style={styles.buttonArea}>
          <PrimaryButton
            label={getButtonLabel()}
            onPress={handleButtonPress}
            disabled={!formReady}
          />

          {/* "Continue" button when children exist and form is empty */}
          {hasChildren && !formReady && (
            <Pressable onPress={() => router.push('/(onboarding)/mic-permission')}>
              <Text style={styles.continueBtn}>Continue</Text>
            </Pressable>
          )}

          {/* "Add another child" link when children exist */}
          {hasChildren && formReady && (
            <Pressable onPress={handleAddChild}>
              <Text style={styles.addAnotherLink}>Add another child</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing(5),
  },
  heading: {
    ...typography.sectionHeading,
    color: colors.text,
    marginBottom: spacing(5),
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing(2),
    marginBottom: spacing(5),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(4),
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: spacing(6),
  },
  field: {
    marginBottom: spacing(4),
  },
  fieldLabel: {
    ...typography.timestamp,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing(2),
  },
  nameInput: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.text,
    paddingVertical: spacing(2),
  },
  nicknameInput: {
    ...typography.formLabel,
    color: colors.text,
    paddingVertical: spacing(2),
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing(2),
  },
  buttonArea: {
    gap: spacing(4),
    alignItems: 'center',
  },
  continueBtn: {
    ...typography.buttonLabel,
    color: colors.accent,
  },
  addAnotherLink: {
    ...typography.formLabel,
    color: colors.accent,
  },
});
