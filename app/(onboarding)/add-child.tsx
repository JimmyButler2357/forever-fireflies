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
  Image,
} from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
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
import { useAuthStore } from '@/stores/authStore';
import { childrenService } from '@/services/children.service';
import { storageService } from '@/services/storage.service';
import { formatDate } from '@/lib/dateUtils';
import { compressPhoto } from '@/lib/imageCompression';
import { useReduceMotion } from '@/hooks/useReduceMotion';
import PhotoCropper from '@/components/PhotoCropper';
import PrimaryButton from '@/components/PrimaryButton';
import BirthdayPicker from '@/components/BirthdayPicker';
import ColorPicker from '@/components/ColorPicker';
import { capture } from '@/lib/posthog';

// Tracks what (if anything) needs to happen to the child's photo at save time.
// 'none'   — no change (leave whatever's already in storage alone)
// 'upload' — user picked a new photo; upload localUri then link the path
// 'remove' — user tapped Remove on an existing photo; delete from storage
type PendingPhotoAction =
  | { type: 'none' }
  | { type: 'upload'; localUri: string }
  | { type: 'remove' };

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

export default function AddChildScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const { children, addChildLocal, removeChildLocal, updateChildLocal } = useChildrenStore();
  const familyId = useAuthStore((s) => s.familyId);

  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthday, setBirthday] = useState('');
  const [colorIndex, setColorIndex] = useState(children.length % childColors.length);
  const [isLoading, setIsLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [editingChildId, setEditingChildId] = useState<string | null>(null);

  // Photo state — `photoPreviewUri` is what the circle shows in the UI
  // (local file URI for a freshly-picked photo OR signed URL for an
  // existing one loaded in edit mode). `photoAction` tells the save
  // handler what actually needs to happen in storage.
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [photoAction, setPhotoAction] = useState<PendingPhotoAction>({ type: 'none' });
  const [isPhotoBusy, setIsPhotoBusy] = useState(false);
  // URI of the freshly-picked photo while the user adjusts the
  // circular crop. Null when the cropper isn't open.
  const [cropSourceUri, setCropSourceUri] = useState<string | null>(null);

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

  // Launch the photo library, let the user crop square, and stage
  // the result for upload at save time. We don't upload yet — the
  // child row may not exist (add mode), and we want one atomic save.
  const handlePickPhoto = async () => {
    let ImagePicker: typeof import('expo-image-picker');
    try {
      ImagePicker = await import('expo-image-picker');
    } catch {
      Alert.alert(
        'Photo module unavailable',
        'Please reinstall dependencies and restart the app to enable photo picking.',
      );
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photo Access Needed', 'Allow photo library access to choose a child photo.');
      return;
    }

    setIsPhotoBusy(true);
    try {
      // Skip the OS native crop UI — our circular cropper opens next
      // and lets the user see the actual avatar framing before saving.
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: (ImagePicker as any).MediaTypeOptions?.Images ?? ['images'],
        allowsEditing: false,
        quality: 1,
      });
      if (picked.canceled || !picked.assets[0]?.uri) return;

      setCropSourceUri(picked.assets[0].uri);
    } finally {
      setIsPhotoBusy(false);
    }
  };

  // Called by PhotoCropper after the user confirms framing.
  // We stage the cropped URI for upload at save time, mirroring the
  // existing pattern (upload happens in applyPhotoAction).
  const handleCroppedPhoto = (croppedUri: string) => {
    setCropSourceUri(null);
    setPhotoPreviewUri(croppedUri);
    setPhotoAction({ type: 'upload', localUri: croppedUri });
  };

  // Clear the preview. In edit mode where an existing photo lives in
  // storage, flag it for removal at save time. In add mode or after a
  // picked-but-unsaved photo, nothing in storage yet — just forget it.
  const handleRemovePhoto = () => {
    const editingChild = editingChildId
      ? children.find((c) => c.id === editingChildId)
      : null;
    const hasExistingPhotoInStorage = !!editingChild?.photoPath;

    setPhotoPreviewUri(null);
    setPhotoAction(hasExistingPhotoInStorage ? { type: 'remove' } : { type: 'none' });
  };

  // Save a child to Supabase, then update local store.
  // Returns true if successful, false if it failed.
  const saveChildToSupabase = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      // The child row we'll sync photo changes against. In add mode this
      // is the just-created row; in edit mode it's the existing one.
      let targetChildId: string;

      if (editingChildId) {
        // ── Edit mode ──
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
        targetChildId = editingChildId;
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
        targetChildId = row.id;
      }

      // ── Photo sync ──
      // Run after the child row is saved so we always have a valid
      // child ID. Wrapped in its own try/catch so a photo failure
      // doesn't lose the name/birthday/color the user just entered —
      // the child saves; we just tell them about the photo problem.
      if (photoAction.type !== 'none') {
        try {
          await applyPhotoAction(targetChildId, photoAction);
        } catch (photoErr) {
          const msg = photoErr instanceof Error ? photoErr.message : 'Could not save photo';
          Alert.alert(
            "Photo didn't save",
            `${msg}\n\nYou can add or change the photo later in Settings.`,
          );
        }
      }

      // Reset form fields and collapse it. The Animated.View `layout`
      // prop on the form card animates the shrink-away.
      setName('');
      setNickname('');
      setBirthday('');
      setColorIndex((children.length + 1) % childColors.length);
      setEditingChildId(null);
      setPhotoPreviewUri(null);
      setPhotoAction({ type: 'none' });
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

  // Upload or remove the child's photo based on the pending action.
  // Also keeps the local store's photoPath in sync so the UI reflects
  // the change immediately.
  const applyPhotoAction = async (childId: string, action: PendingPhotoAction) => {
    if (action.type === 'none') return;
    if (!familyId) throw new Error('Family not loaded yet — try again in a moment');

    if (action.type === 'upload') {
      const compressed = await compressPhoto(action.localUri);
      const path = await storageService.uploadChildPhoto(familyId, childId, compressed.uri);
      await childrenService.updateChild(childId, { photo_url: path });
      updateChildLocal(childId, { photoPath: path });
    } else {
      // remove
      const child = children.find((c) => c.id === childId);
      if (child?.photoPath) {
        await storageService.removeChildPhoto(child.photoPath);
      }
      await childrenService.updateChild(childId, { photo_url: null });
      updateChildLocal(childId, { photoPath: undefined });
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
        setShowForm(true);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not remove child';
      Alert.alert('Error', message);
    }
  };

  // Expand the form with a smooth animation
  const handleShowForm = () => {
    setShowForm(true);
  };

  // Tap a child card to edit — pre-fills the form with that child's data.
  const handleEditChild = (childId: string) => {
    const child = children.find((c) => c.id === childId);
    if (!child) return;

    setName(child.name);
    setNickname(child.nickname ?? '');
    setBirthday(child.birthday ?? '');
    setColorIndex(child.colorIndex);
    setEditingChildId(child.id);
    setPhotoPreviewUri(null);
    setPhotoAction({ type: 'none' });
    setShowForm(true);

    // Resolve the signed URL for the existing photo asynchronously.
    // If it fails (expired token, offline), we just show the empty
    // placeholder — the user can re-pick or leave it unchanged.
    if (child.photoPath) {
      storageService
        .getChildPhotoUrl(child.photoPath)
        .then((url) => {
          // Only restore the preview if the user hasn't already interacted
          // with the photo control. Otherwise we'd clobber a fresh pick
          // or undo a Remove tap that landed first.
          setPhotoAction((currentAction) => {
            if (currentAction.type === 'none') {
              setPhotoPreviewUri(url);
            }
            return currentAction;
          });
        })
        .catch((err) => console.warn('Failed to load child photo preview:', err));
    }
  };

  // Collapse the form without saving
  const handleCancelForm = () => {
    setName('');
    setNickname('');
    setBirthday('');
    setEditingChildId(null);
    setPhotoPreviewUri(null);
    setPhotoAction({ type: 'none' });
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
          <Animated.View
            style={styles.card}
            layout={reduceMotion ? undefined : LinearTransition.duration(250)}
          >
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

            {/* Photo field — optional. Tap the circle to pick; tap "Remove"
                to clear. The circle shows either the picked/stored photo
                or the child's color-tinted placeholder with a + icon. */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Photo (optional)</Text>
              <View style={styles.photoRow}>
                <Pressable
                  onPress={handlePickPhoto}
                  disabled={isLoading || isPhotoBusy}
                  accessibilityLabel={photoPreviewUri ? 'Change photo' : 'Add photo'}
                  style={({ pressed }) => [
                    styles.photoCircle,
                    { borderColor: childColors[colorIndex]?.hex ?? childColors[0].hex },
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  {photoPreviewUri ? (
                    <Image source={{ uri: photoPreviewUri }} style={styles.photoImage} />
                  ) : (
                    <Ionicons
                      name="add"
                      size={28}
                      color={childColors[colorIndex]?.hex ?? childColors[0].hex}
                    />
                  )}
                </Pressable>
                {photoPreviewUri && (
                  <Pressable
                    onPress={handleRemovePhoto}
                    disabled={isLoading || isPhotoBusy}
                    hitSlop={hitSlop.icon}
                  >
                    <Text style={styles.photoRemoveLink}>Remove photo</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </Animated.View>
        )}

        {/* Buttons */}
        <Animated.View
          style={styles.buttonArea}
          layout={reduceMotion ? undefined : LinearTransition.duration(250)}
        >
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
        </Animated.View>
      </ScrollView>

      {/* In-app circular cropper — appears after the user picks a photo.
          Replaces the OS native cropper so the framing matches the
          actual circular avatar. */}
      <PhotoCropper
        visible={!!cropSourceUri}
        sourceUri={cropSourceUri}
        onCancel={() => setCropSourceUri(null)}
        onConfirm={handleCroppedPhoto}
      />
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
    color: colors.textOnAccent,
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
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
  },
  photoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.bg,
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveLink: {
    ...typography.formLabel,
    color: colors.textMuted,
  },
});
