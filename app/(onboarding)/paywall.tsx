import { useState } from 'react';
import { View, Text, ScrollView, Pressable, Alert, StyleSheet } from 'react-native';
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
} from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { profilesService } from '@/services/profiles.service';
import PrimaryButton from '@/components/PrimaryButton';
import { PAYWALL_VALUE_PROPS } from '@/lib/subscriptionHelpers';

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const [isLoading, setIsLoading] = useState(false);

  // Mark onboarding complete in TWO places:
  // 1. Supabase (server) — so the flag survives across devices
  // 2. Local store — so the router redirects immediately
  const handleContinue = async () => {
    setIsLoading(true);
    try {
      await profilesService.completeOnboarding();
    } catch (error) {
      // Non-blocking — if server update fails, the local flag
      // still works. Next time handleAuthChange runs, it'll
      // sync from the server anyway.
      console.warn('Failed to mark onboarding complete on server:', error);
    }
    setOnboarded();
    router.replace('/(main)/home');
  };

  return (
    <View style={styles.container}>
      {/* Dismiss button — subtle, top right */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing(3) }]}>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={handleContinue}
          hitSlop={hitSlop.icon}
          style={({ pressed }) => [
            styles.dismissBtn,
            pressed && { opacity: 0.6 },
          ]}
        >
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Celebratory Illustration ──────────────── */}
        {/* A golden glow circle with sparkle icons scattered
            around it — warm confetti, not party-store colors.
            Think: a firefly jar glowing on a summer evening. */}
        <View style={styles.illustrationArea}>
          {/* Outer glow ring */}
          <View style={styles.glowRingOuter} />
          {/* Inner glow circle */}
          <View style={styles.glowCircle}>
            <Ionicons name="gift" size={48} color={colors.glow} />
          </View>

          {/* Sparkles — absolutely positioned around the circle */}
          <Ionicons name="sparkles" size={16} color={colors.glow} style={styles.sparkle1} />
          <Ionicons name="star" size={12} color={colors.accent} style={styles.sparkle2} />
          <Ionicons name="sparkles" size={14} color={colors.glow} style={styles.sparkle3} />
          <Ionicons name="star" size={10} color={colors.glow} style={styles.sparkle4} />
          <Ionicons name="sparkles" size={12} color={colors.accent} style={styles.sparkle5} />
          <Ionicons name="star" size={14} color={colors.glow} style={styles.sparkle6} />
        </View>

        {/* ─── Heading — serif italic ────────────────── */}
        <Text style={styles.heading}>
          7 days of Forever Fireflies — on us.
        </Text>

        {/* ─── Body ──────────────────────────────────── */}
        <Text style={styles.body}>
          Enjoy full access, no strings attached.
        </Text>

        {/* ─── Value props ───────────────────────────── */}
        <View style={styles.valueProps}>
          {PAYWALL_VALUE_PROPS.map((prop) => (
            <View key={prop.text} style={styles.valuePropRow}>
              <View style={styles.valuePropIcon}>
                <Ionicons name={prop.icon} size={20} color={colors.accent} />
              </View>
              <Text style={styles.valuePropText}>{prop.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ─── Bottom: CTA + fine print + restore ─────── */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(12) }]}>
        <PrimaryButton
          label="Start my free week"
          onPress={handleContinue}
          disabled={isLoading}
        />
        <Text style={styles.finePrint}>
          $5.99/month  |  $49.99/year
        </Text>
        <Pressable onPress={async () => {
          // Try to restore a previous purchase from Apple/Google.
          // If found, skip straight to the home screen with full access.
          setIsLoading(true);
          try {
            const restored = await useSubscriptionStore.getState().restorePurchases();
            if (restored) {
              // Purchase found — continue to home with full access
              await handleContinue();
            } else {
              Alert.alert(
                'No subscription found',
                'We couldn\'t find an existing subscription for this account.',
              );
            }
          } catch {
            Alert.alert('Restore failed', 'Please try again later.');
          } finally {
            setIsLoading(false);
          }
        }}>
          <Text style={styles.restoreLink}>Already subscribed? Restore purchase</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(5),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dismissBtn: {
    minWidth: minTouchTarget,
    minHeight: minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing(28),
  },
  // ─── Celebratory Illustration ─────────────────────
  illustrationArea: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(6),
  },
  glowRingOuter: {
    position: 'absolute',
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: colors.glowGlow,
  },
  glowCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.glowSoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
    shadowColor: colors.glow,
    shadowOpacity: 0.25,
  },
  // Each sparkle is positioned relative to the illustrationArea
  sparkle1: { position: 'absolute', top: 8, right: 20 },
  sparkle2: { position: 'absolute', top: 24, left: 16 },
  sparkle3: { position: 'absolute', bottom: 20, right: 12 },
  sparkle4: { position: 'absolute', top: 4, left: 40 },
  sparkle5: { position: 'absolute', bottom: 12, left: 24 },
  sparkle6: { position: 'absolute', bottom: 40, right: 4 },
  // ─── Heading ──────────────────────────────────────
  heading: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    fontStyle: 'italic',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(3),
  },
  // ─── Body ─────────────────────────────────────────
  body: {
    ...typography.formLabel,
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(6),
  },
  // ─── Value Props ──────────────────────────────────
  valueProps: {
    gap: spacing(4),
    width: '100%',
  },
  valuePropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  valuePropIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valuePropText: {
    ...typography.formLabel,
    color: colors.text,
    flex: 1,
  },
  // ─── Bottom ───────────────────────────────────────
  bottom: {
    gap: spacing(3),
    alignItems: 'center',
    paddingBottom: spacing(12),
  },
  finePrint: {
    ...typography.caption,
    color: colors.textMuted,
  },
  restoreLink: {
    ...typography.timestamp,
    color: colors.textMuted,
  },
});
