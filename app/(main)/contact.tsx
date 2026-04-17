import { View, Text, Pressable, Linking, Platform, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii, shadows } from '@/constants/theme';
import { config } from '@/lib/config';
import TopBar from '@/components/TopBar';

export default function ContactScreen() {
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  const handleEmail = () => {
    const subject = encodeURIComponent(`Fireflies Feedback — v${appVersion}`);
    const body = encodeURIComponent(
      `\n\n---\nApp: Fireflies v${appVersion}\nPlatform: ${Platform.OS} ${Platform.Version}`,
    );
    Linking.openURL(`mailto:${config.supportEmail}?subject=${subject}&body=${body}`);
  };

  return (
    <View style={styles.container}>
      <TopBar title="Contact Us" showBack />
      <View style={styles.content}>
        <Text style={styles.heading}>We'd love to hear from you</Text>
        <Text style={styles.body}>
          Have a question, idea, or just want to say hi? Reach out anytime.
        </Text>

        {/* Email button */}
        <Pressable
          onPress={handleEmail}
          style={({ pressed }) => [
            styles.button,
            shadows.sm,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="mail-outline" size={20} color={colors.accent} />
          <View style={styles.buttonText}>
            <Text style={styles.buttonLabel}>Send us an email</Text>
            <Text style={styles.buttonSub}>{config.supportEmail}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>

        {/* Website button */}
        <Pressable
          onPress={() => Linking.openURL(config.websiteUrl)}
          style={({ pressed }) => [
            styles.button,
            shadows.sm,
            pressed && styles.buttonPressed,
          ]}
        >
          <Ionicons name="globe-outline" size={20} color={colors.accent} />
          <View style={styles.buttonText}>
            <Text style={styles.buttonLabel}>Visit our website</Text>
            <Text style={styles.buttonSub}>foreverfireflies.app</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing(6),
    paddingTop: spacing(10),
    gap: spacing(4),
  },
  heading: {
    ...typography.sectionHeading,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...typography.formLabel,
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing(4),
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    backgroundColor: colors.card,
    borderRadius: radii.md,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(4),
  },
  buttonPressed: {
    backgroundColor: colors.cardPressed,
  },
  buttonText: {
    flex: 1,
    gap: spacing(1),
  },
  buttonLabel: {
    ...typography.formLabel,
    color: colors.text,
  },
  buttonSub: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
