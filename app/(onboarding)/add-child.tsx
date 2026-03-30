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
  Alert,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  fonts,
  typography,
  spacing,
  radii,
  shadows,
  hitSlop,
  minTouchTarget,
  childColors,
} from '@/constants/theme';
import { useChildrenStore, mapSupabaseChild } from '@/stores/childrenStore';
import { childrenService } from '@/services/children.service';
import { formatDate } from '@/lib/dateUtils';
import PrimaryButton from '@/components/PrimaryButton';
import BirthdayPicker from '@/components/BirthdayPicker';
import ColorPicker from '@/components/ColorPicker';
import { capture } from '@/lib/posthog';

// ─── Add Child Screen ─────────────────────────────────────
//
// This screen writes to Supabase, not just local state.
// The flow:
// 1. User fills in name + birthday (+ optional nickname)
// 2. We call childrenService.createChild() → saves to the database
// 3. The server returns the saved row (with a real UUID)
// 4. We map it to the UI shape and add it to the local store
//
// After adding the first child, the form collapses and shows
// a "Continue" button + "Add another child" option — instead
// of resetting to an empty form which felt confusing.
//
// If the network call fails, we show an error and DON'T add
// anything locally — we never want local and server data to
// get out of sync.

// Enable LayoutAnimation on Android (iOS works out of the box).
// This lets us animate the form expanding/collapsing smoothly.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function AddChildScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { children, addChildLocal, removeChildLocal, updateChildLocal } = useChildrenStore();

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthday, setBirthday] = useState('');
  const [colorIndex, setColorIndex] = useState(children.length % childColors.length);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);

  const hasChildren = children.length > 0;
  const isAtLimit = children.length >= 15;
  const nameEntered = name.trim().length > 0;
  const birthdaySet = !!birthday;
  const formReady = nameEntered && birthdaySet;

  // Dynamic heading — changes based on what stage you're at:
  // 1. No children yet → welcoming question
  // 2. Has children, form hidden → celebration + clear next step
  // 3. Has children, form open → asking about more children
  const lastChild = children[children.length - 1];
  // When editing, show the child's name in the heading so it's clear
  // which child you're modifying. Otherwise, normal add flow headings.
  const editingChild = editingChildId
    ? children.find((c) => c.id === editingChildId)
    : null;

  const heading = editingChildId && editingChild
    ? `Edit ${editingChild.name}`
    : hasChildren
      ? showForm
        ? 'Anyone else?'
        : `${lastChild?.name} is all set!`
      : 'Who are we keeping memories for?';

  // Button label — depends on whether the form is showing or hidden
  const getButtonLabel = () => {
    if (!showForm && hasChildren) return 'Continue';
    if (isLoading) return 'Saving...';
    if (!nameEntered) return 'Enter a name to continue';
    if (!birthdaySet) return 'Add a birthday to continue';
    if (editingChildId) return 'Save changes';
    return `Add ${name.trim()}`;
  };

  // Save a child to Supabase, then update local store.
  // Returns true if successful, false if it failed.
  const saveChildToSupabase = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (editingChildId) {
        // ── Edit mode ──
        // Update the existing child in Supabase, then sync local store.
        const updates = {
          name: name.trim(),
          birthday,
          nickname: nickname.trim() || null,
          color_index: colorIndex,
        };
        await childrenService.updateChild(editingChildId, updates);
        updateChildLocal(editingChildId, {
          name: updates.name,
          birthday: updates.birthday,
          nickname: updates.nickname ?? undefined,
          colorIndex: updates.color_index,
        });
      } else {
        // ── Add mode ──
        // Send to Supabase. The `color_index` auto-increments based
        // on how many children we already have (0, 1, 2... up to 5,
        // then wraps around). `display_order` works the same way.
        const row = await childrenService.createChild({
          name: name.trim(),
          birthday,
          nickname: nickname.trim() || null,
          color_index: colorIndex,
          display_order: children.length,
        });

        // Convert the snake_case database row to our camelCase UI shape
        // and add it to the local store for instant display.
        addChildLocal(mapSupabaseChild(row));
        capture('child_added', { childIndex: children.length });
      }

      // Reset form fields and collapse it. LayoutAnimation makes
      // the form smoothly shrink away instead of popping out.
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setName('');
      setNickname('');
      setBirthday('');
      setColorIndex((children.length + 1) % childColors.length);
      setEditingChildId(null);
      setShowForm(false);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Something went wrong';
      Alert.alert('Could not save', message);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Remove a child — deletes from Supabase, then removes locally.
  // If this was the last child, the form reappears automatically
  // so the user can add at least one.
  const handleRemoveChild = async (id: string) => {
    try {
      await childrenService.deleteChild(id);
      removeChildLocal(id);

      // If that was the last child, show the form again
      if (children.length <= 1) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setShowForm(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not remove child';
      Alert.alert('Error', message);
    }
  };

  // Expand the form with a smooth animation
  const handleShowForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowForm(true);
  };

  // Tap a child card to edit — pre-fills the form with that child's data.
  const handleEditChild = (childId: string) => {
    const child = children.find((c) => c.id === childId);
    if (!child) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setName(child.name);
    setNickname(child.nickname ?? '');
    setBirthday(child.birthday ?? '');
    setColorIndex(child.colorIndex);
    setEditingChildId(child.id);
    setShowForm(true);
  };

  // Collapse the form without saving
  const handleCancelForm = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setName('');
    setNickname('');
    setBirthday('');
    setEditingChildId(null);
    setShowForm(false);
  };

  const handleButtonPress = async () => {
    // When form is hidden, "Continue" navigates forward
    if (!showForm && hasChildren) {
      router.push('/(onboarding)/mic-permission');
      return;
    }
    // When form is showing, "Add [name]" saves the child
    if (!formReady) return;
    await saveChildToSupabase();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + spacing(8), paddingBottom: insets.bottom + spacing(5) }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Heading */}
        <Text style={styles.heading}>{heading}</Text>

        {/* Saved children cards */}
        {hasChildren && (
          <View style={styles.childCards}>
            {children.map((child) => {
              const color = childColors[child.colorIndex]?.hex ?? childColors[0].hex;
              return (
                <View key={child.id} style={styles.childCard}>
                  <View style={[styles.childCardAccent, { backgroundColor: color }]} />
                  <Pressable
                    onPress={() => handleEditChild(child.id)}
                    style={({ pressed }) => [
                      styles.childCardBody,
                      pressed && styles.childCardPressed,
                    ]}
                  >
                    <View style={[styles.initialCircle, { backgroundColor: color }]}>
                      <Text style={styles.initialText}>
                        {child.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.childCardInfo}>
                      <Text style={styles.childCardName}>{child.name}</Text>
                      {child.birthday && (
                        <Text style={styles.childCardBirthday}>
                          {formatDate(child.birthday, 'long')}
                        </Text>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleRemoveChild(child.id)}
                      hitSlop={hitSlop.icon}
                      style={styles.childCardRemove}
                    >
                      <Ionicons name="close" size={16} color={color} style={{ opacity: 0.6 }} />
                    </Pressable>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* Form card — only visible when adding a child */}
        {showForm && (
          <View style={styles.card}>
            {/* Name field */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.nameInput}
                value={name}
                onChangeText={setName}
                placeholder="Child's name"
                placeholderTextColor={colors.textMuted}
                editable={!isLoading}
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
                editable={!isLoading}
              />
            </View>

            {/* Color field */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Color</Text>
              <ColorPicker selectedIndex={colorIndex} onSelect={setColorIndex} />
            </View>
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonArea}>
          <PrimaryButton
            label={getButtonLabel()}
            onPress={handleButtonPress}
            disabled={showForm && (!formReady || isLoading)}
          />

          {/* When form is hidden and not editing: offer to add another child */}
          {hasChildren && !showForm && !editingChildId && !isAtLimit && (
            <Pressable onPress={handleShowForm}>
              <Text style={styles.addAnotherLink}>+ Add another child</Text>
            </Pressable>
          )}

          {/* At the 15-child limit — show a gentle note */}
          {isAtLimit && !showForm && (
            <Text style={styles.limitNote}>Maximum of 15 children reached</Text>
          )}

          {/* When form is open and children exist: offer to cancel */}
          {hasChildren && showForm && (
            <Pressable onPress={handleCancelForm} disabled={isLoading}>
              <Text style={styles.cancelLink}>Cancel</Text>
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
  childCards: {
    gap: spacing(3),
    marginBottom: spacing(5),
  },
  childCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radii.card,
    ...shadows.sm,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  childCardAccent: {
    width: 3,
  },
  childCardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing(3),
    gap: spacing(3),
  },
  initialCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  childCardInfo: {
    flex: 1,
    gap: 2,
  },
  childCardName: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.text,
  },
  childCardBirthday: {
    ...typography.caption,
    color: colors.textMuted,
  },
  childCardPressed: {
    backgroundColor: colors.bg,
  },
  childCardRemove: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: '700' as const,
    color: colors.text,
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
  addAnotherLink: {
    ...typography.formLabel,
    color: colors.accent,
  },
  cancelLink: {
    ...typography.formLabel,
    color: colors.textMuted,
  },
  limitNote: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
