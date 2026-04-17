// NotificationPermissionModal — shown once after reinstall when the
// user previously opted in to notifications but this device hasn't
// granted phone-level permission yet.
//
// Two outcomes:
// - "Turn on" → requests Android permission → registers push token
// - "Skip" → sets notification_enabled = false in DB so we stop asking

import { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { openAppSettings } from '@/lib/openSettings';
import { Ionicons } from '@expo/vector-icons';
import { colors, space, radii, shadows } from '@/constants/theme';

interface Props {
  visible: boolean;
  onResolve: (enable: boolean) => Promise<{ granted: boolean; openSettings: boolean }>;
  onDone: () => void;
}

export default function NotificationPermissionModal({ visible, onResolve, onDone }: Props) {
  const [loading, setLoading] = useState(false);

  const handleEnable = async () => {
    setLoading(true);
    const result = await onResolve(true);
    setLoading(false);

    if (result.granted) {
      onDone();
      return;
    }

    if (result.openSettings) {
      // Android blocked the prompt (denied too many times).
      // Open phone settings so user can enable manually.
      openAppSettings();
      onDone();
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    await onResolve(false);
    setLoading(false);
    onDone();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconCircle}>
            <Ionicons name="notifications-outline" size={28} color={colors.accent} />
          </View>

          <Text style={styles.title}>Re-enable reminders?</Text>

          <Text style={styles.body}>
            You set up nightly reminders, but this device needs permission to deliver them.
          </Text>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.primaryButtonPressed,
            ]}
            onPress={handleEnable}
            disabled={loading}
          >
            <Text style={styles.primaryButtonText}>Turn on</Text>
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={handleSkip}
            disabled={loading}
          >
            <Text style={styles.secondaryButtonText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: space.lg,
  },
  card: {
    backgroundColor: colors.bg,
    borderRadius: radii.lg,
    padding: space['3xl'],
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
    ...shadows.lg,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.accentSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: space.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  body: {
    fontSize: 14,
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: space['2xl'],
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radii.card,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: space.sm,
  },
  primaryButtonPressed: {
    backgroundColor: colors.accentPressed,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButton: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 14,
    color: colors.textSoft,
  },
});
