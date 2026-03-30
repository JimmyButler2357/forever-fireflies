import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Switch,
  Modal,
  TextInput,
  FlatList,
  Alert,
  Linking,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { config } from '@/lib/config';
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
import { useChildrenStore, mapSupabaseChild, type Child } from '@/stores/childrenStore';
import { useEntriesStore, mapSupabaseEntry, type Entry } from '@/stores/entriesStore';
import { useAuthStore } from '@/stores/authStore';
import { authService } from '@/services/auth.service';
import { childrenService } from '@/services/children.service';
import { entriesService } from '@/services/entries.service';
import { storageService } from '@/services/storage.service';
import TopBar from '@/components/TopBar';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import PrimaryButton from '@/components/PrimaryButton';
import BirthdayPicker, { formatBirthdayDisplay } from '@/components/BirthdayPicker';
import ColorPicker from '@/components/ColorPicker';
import { useLocationPermission } from '@/hooks/useLocation';
import { formatDate, to24Hour, from24Hour, daysAgo } from '@/lib/dateUtils';
import { profilesService } from '@/services/profiles.service';
import { notificationsService } from '@/services/notifications.service';
import { requestPermissions, getExpoPushToken } from '@/lib/notifications';
import { getStoredPushToken } from '@/hooks/useNotifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSubscription } from '@/hooks/useSubscription';
import PostTrialPaywall from '@/components/PostTrialPaywall';
import TimePicker from '@/components/TimePicker';

// ─── Helpers ──────────────────────────────────────────────

// ─── Settings Screen ──────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const children = useChildrenStore((s) => s.children);
  const removeChildLocal = useChildrenStore((s) => s.removeChildLocal);
  const updateChildLocal = useChildrenStore((s) => s.updateChildLocal);
  const addChildLocal = useChildrenStore((s) => s.addChildLocal);
  const addEntryLocal = useEntriesStore((s) => s.addEntryLocal);
  const removeEntryLocal = useEntriesStore((s) => s.removeEntryLocal);
  const signOut = useAuthStore((s) => s.signOut);
  const deleteAccount = useAuthStore((s) => s.deleteAccount);
  const user = useAuthStore((s) => s.user);
  const familyId = useAuthStore((s) => s.familyId);
  const clearChildren = useChildrenStore((s) => s.clearChildren);
  const clearEntries = useEntriesStore((s) => s.clearEntries);
  const { status: locationStatus } = useLocationPermission();
  const { hasAccess, status: subStatus, trialDaysRemaining } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  // Local state
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('8:30 PM');
  const [isSaving, setIsSaving] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [showEditChildModal, setShowEditChildModal] = useState(false);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [editName, setEditName] = useState('');
  const [editBirthday, setEditBirthday] = useState('');
  const [editColorIndex, setEditColorIndex] = useState(0);
  const [editNickname, setEditNickname] = useState('');
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [showAddChildModal, setShowAddChildModal] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildBirthday, setNewChildBirthday] = useState('');
  const [newChildColorIndex, setNewChildColorIndex] = useState(children.length % childColors.length);
  const [newChildNickname, setNewChildNickname] = useState('');

  // Change password modal state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Load saved reminder prefs from Supabase on mount.
  // Think of it like opening a saved document — we read what the
  // user previously saved and fill in the form with those values.
  useEffect(() => {
    let mounted = true;
    profilesService.getProfile().then((profile) => {
      if (!mounted) return;
      if (profile.notification_enabled != null) {
        setReminderEnabled(profile.notification_enabled);
      }
      if (profile.notification_time) {
        setReminderTime(from24Hour(profile.notification_time));
      }
    }).catch((err) => {
      console.warn('Failed to load notification prefs:', err);
    });
    return () => { mounted = false; };
  }, []);

  // Save reminder prefs to Supabase. Called whenever the user
  // toggles the switch or scrolls to a new time.
  const saveReminderPrefs = useCallback(async (enabled: boolean, time: string) => {
    try {
      await profilesService.updateNotificationPrefs({
        notification_enabled: enabled,
        notification_time: to24Hour(time),
      });
    } catch (err) {
      console.warn('Failed to save reminder prefs:', err);
    }
  }, []);

  const handleToggleReminder = useCallback(async (enabled: boolean) => {
    setReminderEnabled(enabled);
    saveReminderPrefs(enabled, reminderTime);

    if (enabled) {
      // Turning ON — make sure we have permission and a registered token.
      const { granted } = await requestPermissions();
      if (!granted) {
        Alert.alert(
          'Notifications Disabled',
          'To receive reminders, enable notifications in your device settings.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Not Now', style: 'cancel' },
          ],
        );
        setReminderEnabled(false);
        saveReminderPrefs(false, reminderTime);
        return;
      }

      // Register push token if we don't have one stored
      const existingToken = await getStoredPushToken();
      if (!existingToken) {
        const token = await getExpoPushToken();
        if (token) {
          const userId = useAuthStore.getState().session?.user?.id;
          if (userId) {
            const platform = Platform.OS as 'ios' | 'android';
            notificationsService.registerDevice(token, platform).catch(
              (err) => console.warn('Failed to register device:', err)
            );
            AsyncStorage.setItem('ff_push_token', token).catch(() => {});
          }
        }
      }
    } else {
      // Turning OFF — deactivate the device so the server stops sending.
      const token = await getStoredPushToken();
      if (token) {
        notificationsService.deactivateDevice(token).catch(
          (err) => console.warn('Failed to deactivate device:', err)
        );
      }
    }
  }, [reminderTime, saveReminderPrefs]);

  const handleTimeChange = useCallback((time: string) => {
    setReminderTime(time);
    saveReminderPrefs(reminderEnabled, time);

    // Recompute the UTC equivalent so the server sends at the new time.
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) {
      profilesService.syncTimezone(tz, to24Hour(time)).catch(
        (err) => console.warn('Failed to sync timezone after time change:', err)
      );
    }
  }, [reminderEnabled, saveReminderPrefs]);

  // Recently deleted entries — fetched from Supabase when the
  // modal opens, not filtered from local state.
  const [deletedEntries, setDeletedEntries] = useState<Entry[]>([]);
  const [isLoadingDeleted, setIsLoadingDeleted] = useState(false);

  // Fetch deleted entries when the modal opens
  const fetchDeletedEntries = useCallback(async () => {
    if (!familyId) return;
    setIsLoadingDeleted(true);
    try {
      const rows = await entriesService.getDeleted(familyId);
      setDeletedEntries(rows.map(mapSupabaseEntry));
    } catch (err) {
      console.warn('Failed to fetch deleted entries:', err);
    } finally {
      setIsLoadingDeleted(false);
    }
  }, [familyId]);

  useEffect(() => {
    if (showDeletedModal) fetchDeletedEntries();
  }, [showDeletedModal]);

  // Build child lookup
  const childMap = useMemo(() => {
    const map: Record<string, Child> = {};
    children.forEach((c) => (map[c.id] = c));
    return map;
  }, [children]);

  // ─── Edit Child Handlers ───────────────────────────────

  const openEditChild = (child: Child) => {
    setEditingChild(child);
    setEditName(child.name);
    setEditBirthday(child.birthday);
    setEditColorIndex(child.colorIndex);
    setEditNickname(child.nickname ?? '');
    setShowEditChildModal(true);
  };

  // Save edits to Supabase, then update the local store.
  // We use the "pessimistic" approach — wait for the server
  // to confirm before updating the UI. This means the user
  // sees a brief loading state, but we never show stale data.
  const saveEditChild = async () => {
    if (!editingChild || !editName.trim() || !editBirthday) return;

    setIsSaving(true);
    try {
      const updated = await childrenService.updateChild(editingChild.id, {
        name: editName.trim(),
        birthday: editBirthday,
        color_index: editColorIndex,
        nickname: editNickname.trim() || null,
      });
      // Update local cache with the server's response
      const mapped = mapSupabaseChild(updated);
      updateChildLocal(mapped.id, {
        name: mapped.name,
        birthday: mapped.birthday,
        colorIndex: mapped.colorIndex,
        nickname: mapped.nickname,
      });
      setShowEditChildModal(false);
      setEditingChild(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not save changes';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Add Child Handler ─────────────────────────────────

  // Create child in Supabase, then add to local store.
  const handleAddChild = async () => {
    if (!newChildName.trim() || !newChildBirthday) return;

    setIsSaving(true);
    try {
      const row = await childrenService.createChild({
        name: newChildName.trim(),
        birthday: newChildBirthday,
        nickname: newChildNickname.trim() || null,
        color_index: newChildColorIndex,
        display_order: children.length,
      });
      addChildLocal(mapSupabaseChild(row));
      setNewChildName('');
      setNewChildBirthday('');
      setNewChildNickname('');
      setNewChildColorIndex((children.length + 1) % childColors.length);
      setShowAddChildModal(false);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Could not add child';
      Alert.alert('Error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const openAddChildModal = () => {
    setNewChildName('');
    setNewChildBirthday('');
    setNewChildNickname('');
    setNewChildColorIndex(children.length % childColors.length);
    setShowAddChildModal(true);
  };

  // ─── Change Password Handlers ─────────────────────────

  // Check if this user signed up with email (not OAuth like Apple/Google).
  // OAuth users don't have a password to change — they sign in through
  // the provider instead. Think of it like: some hotel guests use a
  // keycard (password), others use face recognition (OAuth).
  const isEmailUser = user?.app_metadata?.providers?.includes('email') ?? false;

  const openChangePasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setPasswordError(null);
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmNewPassword(false);
    setShowChangePasswordModal(true);
  };

  const handleChangePassword = async () => {
    if (!currentPassword || newPassword.length < 6 || newPassword !== confirmNewPassword) return;

    setPasswordError(null);
    setIsChangingPassword(true);

    try {
      // Step 1: Verify the current password by trying to sign in with it.
      // This is a UX safety measure — we want to make sure the person
      // changing the password is actually the account owner (not someone
      // who found the phone unlocked).
      const email = user?.email;
      if (!email) throw new Error('No email found on account');
      await authService.signInWithEmail(email, currentPassword);

      // Step 2: Now update to the new password
      await authService.updatePassword(newPassword);

      setShowChangePasswordModal(false);
      Alert.alert('Password Updated', 'Your password has been changed successfully.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      if (message.includes('Invalid login')) {
        setPasswordError('Current password is incorrect.');
      } else {
        setPasswordError(message);
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ─── Delete Account Handler ────────────────────────────

  const handleDeleteAccount = async () => {
    setShowDeleteAccountDialog(false);
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      clearChildren();
      clearEntries();
      router.replace('/(onboarding)');
    } catch (error) {
      console.warn('Delete account error:', error);
      Alert.alert(
        'Deletion failed',
        "We couldn't delete your account right now. Please try again. If this keeps happening, contact support at foreverfirefliesapp@gmail.com.",
      );
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <View style={styles.container}>
      <TopBar title="Settings" showBack />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 1. Children Section ─────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Children</Text>
          <View style={styles.card}>
            {children.map((child, i) => (
              <Pressable
                key={child.id}
                onPress={() => openEditChild(child)}
                style={({ pressed }) => [
                  styles.row,
                  i < children.length - 1 && styles.rowBorder,
                  pressed && { backgroundColor: colors.cardPressed },
                ]}
              >
                <View style={styles.rowContent}>
                  <View style={styles.childInfo}>
                    <View
                      style={[
                        styles.childDot,
                        {
                          backgroundColor:
                            childColors[child.colorIndex]?.hex ??
                            childColors[0].hex,
                        },
                      ]}
                    />
                    <Text style={styles.rowLabel}>{child.name}</Text>
                  </View>
                  <Text style={styles.rowSublabel}>
                    Born {formatBirthdayDisplay(child.birthday)}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </Pressable>
            ))}

            {/* Add child button */}
            {children.length < 15 ? (
              <Pressable
                onPress={openAddChildModal}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: colors.cardPressed },
                ]}
              >
                <View style={styles.addRow}>
                  <Ionicons name="add-circle-outline" size={18} color={colors.accent} />
                  <Text style={styles.addLabel}>Add Child</Text>
                </View>
              </Pressable>
            ) : (
              <View style={[styles.row, { justifyContent: 'center' }]}>
                <Text style={styles.limitNote}>Maximum of 15 children reached</Text>
              </View>
            )}
          </View>
        </View>

        {/* ─── 2. Reminder Section ─────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Daily Reminder</Text>
          <View style={styles.card}>
            {/* Toggle row */}
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Reminder</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={handleToggleReminder}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.card}
              />
            </View>

            {/* Time row */}
            <Pressable
              onPress={() => reminderEnabled && setShowTimePicker((p) => !p)}
              style={({ pressed }) => [
                styles.row,
                !reminderEnabled && { opacity: 0.5 },
                pressed && reminderEnabled && { backgroundColor: colors.cardPressed },
              ]}
            >
              <Text style={styles.rowLabel}>Time</Text>
              <View style={styles.timeValueRow}>
                <Text style={styles.timeValue}>{reminderTime}</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </View>
            </Pressable>

            {/* Time picker (scroll wheels) */}
            {showTimePicker && reminderEnabled && (
              <TimePicker value={reminderTime} onChange={handleTimeChange} />
            )}
          </View>
        </View>

        {/* ─── 3. Subscription Section ─────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Subscription</Text>
          <View style={styles.card}>
            <Pressable
              onPress={() => {
                if (subStatus === 'expired') {
                  // Open the paywall so they can subscribe
                  setShowPaywall(true);
                } else if (subStatus === 'active') {
                  // Open the platform's native subscription management page
                  Linking.openURL('https://play.google.com/store/account/subscriptions');
                }
              }}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors.cardPressed },
              ]}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Plan</Text>
                <Text style={styles.rowSublabel}>
                  {subStatus === 'trial' && `Free Trial — ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''} remaining`}
                  {subStatus === 'active' && 'Active subscription'}
                  {subStatus === 'expired' && 'Expired — tap to subscribe'}
                  {subStatus === 'loading' && 'Loading...'}
                </Text>
              </View>
              {(subStatus === 'expired' || subStatus === 'active') && (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              )}
            </Pressable>
          </View>
        </View>

        {/* ─── 4. Account Security (email users only) ── */}
        {isEmailUser && (
          <View style={styles.section}>
            <Text style={styles.sectionHeader}>Account Security</Text>
            <View style={styles.card}>
              <Pressable
                onPress={openChangePasswordModal}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: colors.cardPressed },
                ]}
              >
                <Text style={styles.rowLabel}>Change Password</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
          </View>
        )}

        {/* ─── 5. Recently Deleted ─────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Recently Deleted</Text>
          <View style={[styles.card, styles.deletedSectionCard]}>
            <Pressable
              onPress={() => setShowDeletedModal(true)}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors.cardPressed },
              ]}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>View deleted memories</Text>
                <Text style={styles.rowSublabel}>
                  {deletedEntries.length > 0
                    ? `${deletedEntries.length} ${deletedEntries.length === 1 ? 'entry' : 'entries'} · Kept for 30 days`
                    : 'Entries are kept for 30 days'}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {/* ─── 6. Data & Privacy ───────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>Data & Privacy</Text>
          <View style={styles.card}>
            <Pressable
              onPress={() => {
                // No-op for MVP
              }}
              style={({ pressed }) => [
                styles.row,
                styles.rowBorder,
                pressed && { backgroundColor: colors.cardPressed },
              ]}
            >
              <Text style={styles.rowLabel}>Export All Entries</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>

            <Pressable
              onPress={() => Linking.openSettings()}
              style={({ pressed }) => [
                styles.row,
                styles.rowBorder,
                pressed && { backgroundColor: colors.cardPressed },
              ]}
            >
              <View style={styles.rowContent}>
                <Text style={styles.rowLabel}>Location</Text>
                <Text style={styles.rowSublabel}>
                  {locationStatus === 'available'
                    ? 'Tag where memories happen'
                    : locationStatus === 'services_off'
                      ? 'Location Services are off in phone settings'
                      : 'Turn on to auto-tag locations'}
                </Text>
              </View>
              <Text style={[styles.rowSublabel, {
                color: locationStatus === 'available'
                  ? colors.accent
                  : locationStatus === 'services_off'
                    ? colors.warning
                    : colors.textMuted,
              }]}>
                {locationStatus === 'available'
                  ? 'On'
                  : locationStatus === 'services_off'
                    ? 'Limited'
                    : 'Off'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setShowDeleteAccountDialog(true)}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors.cardPressed },
              ]}
            >
              <Text style={styles.dangerLabel}>Delete Account</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.accent}
              />
            </Pressable>
          </View>
        </View>

        {/* ─── 7. About ────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>About</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowBorder]}>
              <Text style={styles.rowLabel}>Version</Text>
              <Text style={styles.rowSublabel}>1.0.0</Text>
            </View>
            <Pressable
              onPress={() => Linking.openURL(config.privacyPolicyUrl)}
              style={({ pressed }) => [
                styles.row,
                styles.rowBorder,
                pressed && { backgroundColor: colors.cardPressed },
              ]}
            >
              <Text style={styles.rowLabel}>Privacy Policy</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(config.termsOfServiceUrl)}
              style={({ pressed }) => [
                styles.row,
                styles.rowBorder,
                pressed && { backgroundColor: colors.cardPressed },
              ]}
            >
              <Text style={styles.rowLabel}>Terms of Service</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                const subject = encodeURIComponent('Fireflies Feedback — v1.0.0');
                const body = encodeURIComponent(`\n\n---\nApp: Fireflies v1.0.0\nPlatform: ${Platform.OS} ${Platform.Version}`);
                Linking.openURL(`mailto:${config.supportEmail}?subject=${subject}&body=${body}`);
              }}
              style={({ pressed }) => [
                styles.row,
                pressed && { backgroundColor: colors.cardPressed },
              ]}
            >
              <Text style={styles.rowLabel}>Contact Support</Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
        </View>

        {/* Bottom spacer */}
        <View style={{ height: insets.bottom + spacing(8) }} />
      </ScrollView>

      {/* ─── Edit Child Modal (full-screen) ──────── */}
      <Modal
        visible={showEditChildModal}
        animationType="slide"
        onRequestClose={() => setShowEditChildModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.fullModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.fullModalHeader, { paddingTop: insets.top + spacing(3) }]}>
            <Pressable
              onPress={() => setShowEditChildModal(false)}
              hitSlop={hitSlop.icon}
              style={({ pressed }) => [
                styles.fullModalCloseBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.fullModalTitle}>Edit Child</Text>
            <View style={{ width: minTouchTarget }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.fullModalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name */}
            <Text style={styles.inputLabelRequired}>Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              style={styles.textInput}
              placeholder="Child's name"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            {/* Birthday */}
            <Text style={styles.inputLabelRequired}>Birthday</Text>
            <View style={styles.pickerField}>
              <BirthdayPicker
                value={editBirthday || undefined}
                onChange={setEditBirthday}
              />
            </View>

            {/* Color */}
            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.pickerField}>
              <ColorPicker
                selectedIndex={editColorIndex}
                onSelect={setEditColorIndex}
              />
            </View>

            {/* Nickname */}
            <Text style={styles.inputLabel}>Nickname (optional)</Text>
            <TextInput
              value={editNickname}
              onChangeText={setEditNickname}
              style={styles.textInput}
              placeholder="Used for voice auto-detection"
              placeholderTextColor={colors.textMuted}
            />

            {/* Save button */}
            <View style={styles.fullModalButtonArea}>
              <PrimaryButton
                label={isSaving ? 'Saving...' : 'Save'}
                onPress={saveEditChild}
                disabled={!editName.trim() || !editBirthday || isSaving}
              />
            </View>

            {/* Remove child */}
            {children.length > 1 && editingChild && (
              <Pressable
                onPress={async () => {
                  try {
                    await childrenService.deleteChild(editingChild.id);
                    removeChildLocal(editingChild.id);
                    setShowEditChildModal(false);
                    setEditingChild(null);
                  } catch (error) {
                    const msg = error instanceof Error ? error.message : 'Could not remove child';
                    Alert.alert('Error', msg);
                  }
                }}
                disabled={isSaving}
                style={({ pressed }) => [
                  styles.removeChildBtn,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={styles.dangerLabel}>Remove Child</Text>
              </Pressable>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Add Child Modal (full-screen) ──────── */}
      <Modal
        visible={showAddChildModal}
        animationType="slide"
        onRequestClose={() => setShowAddChildModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.fullModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.fullModalHeader, { paddingTop: insets.top + spacing(3) }]}>
            <Pressable
              onPress={() => setShowAddChildModal(false)}
              hitSlop={hitSlop.icon}
              style={({ pressed }) => [
                styles.fullModalCloseBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.fullModalTitle}>Add Child</Text>
            <View style={{ width: minTouchTarget }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.fullModalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name */}
            <Text style={styles.inputLabelRequired}>Name</Text>
            <TextInput
              value={newChildName}
              onChangeText={setNewChildName}
              style={styles.textInput}
              placeholder="Child's name"
              placeholderTextColor={colors.textMuted}
              autoFocus
            />

            {/* Birthday */}
            <Text style={styles.inputLabelRequired}>Birthday</Text>
            <View style={styles.pickerField}>
              <BirthdayPicker
                value={newChildBirthday || undefined}
                onChange={setNewChildBirthday}
              />
            </View>

            {/* Color */}
            <Text style={styles.inputLabel}>Color</Text>
            <View style={styles.pickerField}>
              <ColorPicker
                selectedIndex={newChildColorIndex}
                onSelect={setNewChildColorIndex}
              />
            </View>

            {/* Nickname */}
            <Text style={styles.inputLabel}>Nickname (optional)</Text>
            <TextInput
              value={newChildNickname}
              onChangeText={setNewChildNickname}
              style={styles.textInput}
              placeholder="Used for voice auto-detection"
              placeholderTextColor={colors.textMuted}
            />

            {/* Add button */}
            <View style={styles.fullModalButtonArea}>
              <PrimaryButton
                label={isSaving
                  ? 'Saving...'
                  : newChildName.trim() && newChildBirthday
                    ? `Add ${newChildName.trim()}`
                    : 'Fill name & birthday to continue'}
                onPress={handleAddChild}
                disabled={!newChildName.trim() || !newChildBirthday || isSaving}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Recently Deleted Modal ────────────── */}
      <Modal
        visible={showDeletedModal}
        animationType="slide"
        onRequestClose={() => setShowDeletedModal(false)}
      >
        <View style={styles.deletedModalContainer}>
          <View style={[styles.deletedHeader, { paddingTop: insets.top + spacing(3) }]}>
            <Pressable
              onPress={() => setShowDeletedModal(false)}
              hitSlop={hitSlop.icon}
              style={({ pressed }) => [
                styles.deletedCloseBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.deletedTitle}>Recently Deleted</Text>
            <View style={{ width: minTouchTarget }} />
          </View>

          {isLoadingDeleted ? (
            <View style={styles.deletedEmpty}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : deletedEntries.length === 0 ? (
            <View style={styles.deletedEmpty}>
              <Ionicons name="trash-outline" size={40} color={colors.textMuted} />
              <Text style={styles.deletedEmptyText}>No deleted memories</Text>
              <Text style={styles.deletedEmptyBody}>
                Deleted entries appear here for 30 days.
              </Text>
            </View>
          ) : (
            <FlatList
              data={deletedEntries}
              keyExtractor={(item) => item.id}
              contentContainerStyle={[styles.deletedList, { paddingBottom: insets.bottom + spacing(8) }]}
              renderItem={({ item }) => {
                const childNames = item.childIds
                  .map((id) => childMap[id]?.name ?? 'Unknown')
                  .join(', ');
                const deletedDays = item.deletedAt
                  ? daysAgo(item.deletedAt)
                  : 0;

                return (
                  <View style={styles.deletedCard}>
                    <Text style={styles.deletedPreview} numberOfLines={2}>
                      {item.text}
                    </Text>
                    <Text style={styles.deletedMeta}>
                      {childNames} · {formatDate(item.date)} · Deleted{' '}
                      {deletedDays === 0
                        ? 'today'
                        : `${deletedDays}d ago`}
                    </Text>
                    <View style={styles.deletedActions}>
                      <Pressable
                        onPress={async () => {
                          try {
                            await entriesService.restore(item.id);
                            // Refetch the full entry and add it back to Home
                            const row = await entriesService.getEntry(item.id);
                            addEntryLocal(mapSupabaseEntry(row));
                            // Remove from local deleted list
                            setDeletedEntries((prev) =>
                              prev.filter((e) => e.id !== item.id),
                            );
                          } catch (err) {
                            console.warn('Failed to restore:', err);
                          }
                        }}
                        style={({ pressed }) => [
                          styles.restoreBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Ionicons
                          name="arrow-undo-outline"
                          size={14}
                          color={colors.accent}
                        />
                        <Text style={styles.restoreLabel}>Restore</Text>
                      </Pressable>
                      <Pressable
                        onPress={async () => {
                          try {
                            await entriesService.hardDelete(item.id);
                            setDeletedEntries((prev) =>
                              prev.filter((e) => e.id !== item.id),
                            );
                          } catch (err) {
                            console.warn('Failed to permanently delete:', err);
                          }
                        }}
                        style={({ pressed }) => [
                          styles.permDeleteBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <Text style={styles.permDeleteLabel}>
                          Delete forever
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
              ItemSeparatorComponent={() => (
                <View style={{ height: spacing(3) }} />
              )}
            />
          )}
        </View>
      </Modal>

      {/* ─── Change Password Modal ────────────── */}
      <Modal
        visible={showChangePasswordModal}
        animationType="slide"
        onRequestClose={() => setShowChangePasswordModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.fullModalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={[styles.fullModalHeader, { paddingTop: insets.top + spacing(3) }]}>
            <Pressable
              onPress={() => setShowChangePasswordModal(false)}
              hitSlop={hitSlop.icon}
              style={({ pressed }) => [
                styles.fullModalCloseBtn,
                pressed && { opacity: 0.6 },
              ]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.fullModalTitle}>Change Password</Text>
            <View style={{ width: minTouchTarget }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.fullModalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Current Password */}
            <Text style={styles.inputLabelRequired}>Current Password</Text>
            <View style={styles.passwordFieldContainer}>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                style={styles.passwordFieldInput}
                placeholder="Enter current password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showCurrentPassword}
                autoComplete="current-password"
                editable={!isChangingPassword}
                autoFocus
              />
              <Pressable
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                hitSlop={hitSlop.icon}
                style={styles.passwordEyeBtn}
              >
                <MaterialIcons
                  name={showCurrentPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>

            {/* New Password */}
            <Text style={styles.inputLabelRequired}>New Password</Text>
            <View style={styles.passwordFieldContainer}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                style={styles.passwordFieldInput}
                placeholder="At least 6 characters"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showNewPassword}
                autoComplete="new-password"
                editable={!isChangingPassword}
              />
              <Pressable
                onPress={() => setShowNewPassword(!showNewPassword)}
                hitSlop={hitSlop.icon}
                style={styles.passwordEyeBtn}
              >
                <MaterialIcons
                  name={showNewPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
            {newPassword.length > 0 && newPassword.length < 6 && (
              <Text style={styles.passwordHint}>Must be at least 6 characters</Text>
            )}

            {/* Confirm New Password */}
            <Text style={styles.inputLabelRequired}>Confirm New Password</Text>
            <View style={styles.passwordFieldContainer}>
              <TextInput
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                style={styles.passwordFieldInput}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirmNewPassword}
                autoComplete="new-password"
                editable={!isChangingPassword}
              />
              <Pressable
                onPress={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                hitSlop={hitSlop.icon}
                style={styles.passwordEyeBtn}
              >
                <MaterialIcons
                  name={showConfirmNewPassword ? 'visibility' : 'visibility-off'}
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            </View>
            {confirmNewPassword.length > 0 && confirmNewPassword !== newPassword && (
              <Text style={styles.passwordHint}>Passwords don't match</Text>
            )}

            {/* Error */}
            {passwordError && (
              <Text style={styles.passwordError}>{passwordError}</Text>
            )}

            {/* Submit */}
            <View style={styles.fullModalButtonArea}>
              <PrimaryButton
                label={isChangingPassword ? 'Updating...' : 'Update Password'}
                onPress={handleChangePassword}
                disabled={
                  !currentPassword ||
                  newPassword.length < 6 ||
                  newPassword !== confirmNewPassword ||
                  isChangingPassword
                }
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── Delete Account Confirmation ───────── */}
      <ConfirmationDialog
        visible={showDeleteAccountDialog}
        title="Delete your account?"
        body={
          'This will permanently delete your account and all associated data, including:\n\n' +
          '\u2022 All audio recordings\n' +
          '\u2022 All text entries and memories\n' +
          '\u2022 Children and family settings\n' +
          '\u2022 Your profile and preferences\n\n' +
          'This action cannot be undone.\n\n' +
          'If you have an active subscription, you\u2019ll need to cancel it separately in your app store settings.'
        }
        confirmLabel="Delete My Account"
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteAccountDialog(false)}
      />

      {/* Post-trial paywall — shown when user taps the expired subscription row */}
      <PostTrialPaywall visible={showPaywall} onClose={() => setShowPaywall(false)} />

      {/* ─── Deleting Account Overlay ────────────── */}
      {isDeletingAccount && (
        <View style={styles.deletingOverlay}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.deletingText}>Deleting your account...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(2),
  },
  // ─── Sections ──────────────────────────
  section: {
    marginBottom: spacing(3),
  },
  sectionHeader: {
    ...typography.timestamp,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing(2),
    marginLeft: spacing(1),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    overflow: 'hidden',
  },
  deletedSectionCard: {
    borderColor: childColorWithOpacity(colors.accent, 0.25),
  },
  // ─── Rows ──────────────────────────────
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(3) + 1, // ~13px
    paddingHorizontal: spacing(4),
    minHeight: minTouchTarget,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowContent: {
    flex: 1,
    marginRight: spacing(2),
  },
  rowLabel: {
    ...typography.formLabel,
    color: colors.text,
  },
  rowSublabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  dangerLabel: {
    ...typography.formLabel,
    color: colors.accent,
  },
  // ─── Child Info ────────────────────────
  childInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: 2,
  },
  childDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  // ─── Add Row ───────────────────────────
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  addLabel: {
    ...typography.formLabel,
    color: colors.accent,
    fontWeight: '600',
  },
  limitNote: {
    ...typography.caption,
    color: colors.textMuted,
  },
  // ─── Time Picker ──────────────────────
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
  },
  timeValue: {
    ...typography.formLabel,
    color: colors.accent,
    fontWeight: '600',
  },
  // ─── Modals (Edit/Add Child) ──────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.overlay,
    paddingHorizontal: spacing(5),
  },
  modalCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(6),
  },
  modalTitle: {
    ...typography.screenTitle,
    color: colors.text,
    marginBottom: spacing(4),
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing(2),
  },
  inputLabelRequired: {
    ...typography.caption,
    fontWeight: '700' as const,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing(2),
  },
  textInput: {
    ...typography.formLabel,
    color: colors.text,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
    marginBottom: spacing(3),
  },
  modalMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing(4),
  },
  modalButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    marginTop: spacing(2),
  },
  modalButtonCancel: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radii.md,
    backgroundColor: colors.tag,
  },
  modalButtonSave: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radii.md,
    backgroundColor: colors.accent,
  },
  modalButtonDanger: {
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    borderRadius: radii.md,
  },
  cancelLabel: {
    ...typography.buttonLabel,
    fontSize: 13,
    color: colors.textSoft,
  },
  saveLabel: {
    ...typography.buttonLabel,
    fontSize: 13,
    color: colors.card,
  },
  // ─── Full-screen Modal (Add/Edit Child) ─
  fullModalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  fullModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  fullModalCloseBtn: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullModalTitle: {
    ...typography.screenTitle,
    color: colors.text,
  },
  fullModalContent: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(8),
  },
  pickerField: {
    marginBottom: spacing(4),
  },
  fullModalButtonArea: {
    marginTop: spacing(4),
  },
  // ─── Change Password Modal ────────────
  passwordFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    marginBottom: spacing(3),
  },
  passwordFieldInput: {
    ...typography.formLabel,
    color: colors.text,
    flex: 1,
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(3),
  },
  passwordEyeBtn: {
    paddingHorizontal: spacing(3),
  },
  passwordHint: {
    ...typography.caption,
    color: colors.warning,
    marginTop: -spacing(2),
    marginBottom: spacing(3),
  },
  passwordError: {
    ...typography.caption,
    color: colors.danger,
    marginBottom: spacing(4),
  },
  removeChildBtn: {
    alignItems: 'center',
    paddingVertical: spacing(4),
    marginTop: spacing(2),
  },
  // ─── Recently Deleted Modal ────────────
  deletedModalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  deletedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  deletedCloseBtn: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletedTitle: {
    ...typography.screenTitle,
    color: colors.text,
  },
  deletedList: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(8),
  },
  deletedEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(3),
  },
  deletedEmptyText: {
    ...typography.sectionHeading,
    color: colors.text,
  },
  deletedEmptyBody: {
    ...typography.formLabel,
    color: colors.textSoft,
  },
  // ─── Deleted Entry Card ────────────────
  deletedCard: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(4),
    ...shadows.sm,
  },
  deletedPreview: {
    ...typography.entryPreview,
    color: colors.text,
    marginBottom: spacing(2),
  },
  deletedMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing(3),
  },
  deletedActions: {
    flexDirection: 'row',
    gap: spacing(4),
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(1),
    paddingVertical: spacing(1),
  },
  restoreLabel: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
  },
  permDeleteBtn: {
    paddingVertical: spacing(1),
  },
  permDeleteLabel: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '600',
  },
  // ─── Deleting Account Overlay ────────────
  deletingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(44, 36, 32, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing(4),
  },
  deletingText: {
    ...typography.formLabel,
    color: colors.card,
    fontWeight: '500',
  },
});
