// PostTrialPaywall — shown when the user's 7-day free trial has expired.
//
// Think of this like the "your free pass has ended" screen at a museum.
// It reassures the user that their memories are safe (not deleted!), and
// offers them a way to subscribe to keep adding new ones.
//
// Key differences from the onboarding paywall:
// - Uses a lock icon instead of a gift (trial is over, not starting)
// - Shows plan selection cards (monthly vs annual)
// - Has a "Subscribe" button instead of "Start my free week"
// - Appears as a slide-up modal, not a full onboarding screen

import { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
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
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { getOfferings, purchasePackage } from '@/lib/revenueCat';
import { PAYWALL_VALUE_PROPS } from '@/lib/subscriptionHelpers';
import PrimaryButton from '@/components/PrimaryButton';
import { capture } from '@/lib/posthog';
import type { PurchasesPackage } from 'react-native-purchases';

// ─── Props ──────────────────────────────────────────────

interface PostTrialPaywallProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Called when the user dismisses the modal or completes a purchase */
  onClose: () => void;
};

// ─── Plan options — annual is pre-selected since it's better value ──

type PlanId = 'annual' | 'monthly';

// ─── Component ──────────────────────────────────────────

export default function PostTrialPaywall({ visible, onClose }: PostTrialPaywallProps) {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('annual');
  const [isLoading, setIsLoading] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[] | null>(null);

  // Load RevenueCat offerings when the modal opens.
  // These are the actual subscription products from the app store.
  useEffect(() => {
    if (visible) {
      getOfferings().then(setPackages).catch(() => {
        // RevenueCat not configured — buttons will show an alert instead
      });
    }
  }, [visible]);

  // Handle the subscribe button tap.
  // Finds the right package (monthly or annual) and triggers the native
  // purchase flow (Google Play sheet or App Store sheet).
  const handleSubscribe = async () => {
    if (!packages || packages.length === 0) {
      Alert.alert(
        'Not available yet',
        'Subscriptions will be available soon. Your memories are safe in the meantime.',
      );
      return;
    }

    // Find the package matching the selected plan.
    // RevenueCat package types: ANNUAL, MONTHLY, etc.
    const targetType = selectedPlan === 'annual' ? 'ANNUAL' : 'MONTHLY';
    const pkg = packages.find((p) => p.packageType === targetType) ?? packages[0];

    setIsLoading(true);
    try {
      const info = await purchasePackage(pkg);
      if (info) {
        // Purchase succeeded — grant access immediately
        useSubscriptionStore.getState().onPurchaseComplete();
        capture('subscription_converted', { plan: selectedPlan });
        onClose();
      }
      // If info is null, user cancelled — do nothing
    } catch {
      Alert.alert('Purchase failed', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle restore purchase tap.
  const handleRestore = async () => {
    setIsLoading(true);
    try {
      const restored = await useSubscriptionStore.getState().restorePurchases();
      if (restored) {
        onClose();
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
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Top bar with dismiss button */}
        <View style={styles.topBar}>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={onClose}
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
          {/* ─── Illustration — lock icon in golden glow ──── */}
          <View style={styles.illustrationArea}>
            <View style={styles.glowRingOuter} />
            <View style={styles.glowCircle}>
              <Ionicons name="lock-closed" size={48} color={colors.glow} />
            </View>
            <Ionicons name="sparkles" size={16} color={colors.glow} style={styles.sparkle1} />
            <Ionicons name="star" size={12} color={colors.accent} style={styles.sparkle2} />
            <Ionicons name="sparkles" size={14} color={colors.glow} style={styles.sparkle3} />
            <Ionicons name="star" size={10} color={colors.glow} style={styles.sparkle4} />
          </View>

          {/* ─── Heading ─────────────────────────────────── */}
          <Text style={styles.heading}>Your free week has ended</Text>

          {/* ─── Body ────────────────────────────────────── */}
          <Text style={styles.body}>
            Your memories are safe — subscribe anytime to keep adding new ones.
          </Text>

          {/* ─── Value Props ─────────────────────────────── */}
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

          {/* ─── Plan Selection ──────────────────────────── */}
          <View style={styles.planCards}>
            {/* Annual plan — highlighted with "Save 30%" badge */}
            <Pressable
              onPress={() => setSelectedPlan('annual')}
              style={[
                styles.planCard,
                selectedPlan === 'annual' && styles.planCardSelected,
              ]}
            >
              <View style={styles.planCardHeader}>
                <Text style={[
                  styles.planName,
                  selectedPlan === 'annual' && styles.planNameSelected,
                ]}>
                  Annual
                </Text>
                <View style={styles.saveBadge}>
                  <Text style={styles.saveBadgeText}>Save 30%</Text>
                </View>
              </View>
              <Text style={[
                styles.planPrice,
                selectedPlan === 'annual' && styles.planPriceSelected,
              ]}>
                $49.99/year
              </Text>
              <Text style={styles.planSubtext}>$4.17/month</Text>
            </Pressable>

            {/* Monthly plan */}
            <Pressable
              onPress={() => setSelectedPlan('monthly')}
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardSelected,
              ]}
            >
              <Text style={[
                styles.planName,
                selectedPlan === 'monthly' && styles.planNameSelected,
              ]}>
                Monthly
              </Text>
              <Text style={[
                styles.planPrice,
                selectedPlan === 'monthly' && styles.planPriceSelected,
              ]}>
                $5.99/month
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* ─── Bottom: CTA + fine print + restore ──────── */}
        <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(8) }]}>
          <PrimaryButton
            label="Subscribe"
            onPress={handleSubscribe}
            disabled={isLoading}
          />
          <Text style={styles.finePrint}>
            {selectedPlan === 'annual' ? '$49.99/year' : '$5.99/month'}
            {'  ·  '}Cancel anytime
          </Text>
          <Pressable onPress={handleRestore} disabled={isLoading}>
            <Text style={styles.restoreLink}>Restore purchase</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing(5),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing(3),
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
    paddingBottom: spacing(8),
  },
  // ─── Illustration ──────────────────────────
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
  sparkle1: { position: 'absolute', top: 8, right: 20 },
  sparkle2: { position: 'absolute', top: 24, left: 16 },
  sparkle3: { position: 'absolute', bottom: 20, right: 12 },
  sparkle4: { position: 'absolute', top: 4, left: 40 },
  // ─── Heading ───────────────────────────────
  heading: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
    fontStyle: 'italic',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(3),
  },
  // ─── Body ──────────────────────────────────
  body: {
    ...typography.formLabel,
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing(6),
  },
  // ─── Value Props ───────────────────────────
  valueProps: {
    gap: spacing(4),
    width: '100%',
    marginBottom: spacing(8),
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
  // ─── Plan Cards ────────────────────────────
  planCards: {
    width: '100%',
    gap: spacing(3),
  },
  planCard: {
    padding: spacing(4),
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  planCardSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginBottom: spacing(1),
  },
  planName: {
    ...typography.formLabel,
    fontWeight: '700',
    color: colors.textSoft,
  },
  planNameSelected: {
    color: colors.text,
  },
  saveBadge: {
    backgroundColor: colors.accent,
    paddingVertical: spacing(1),
    paddingHorizontal: spacing(2),
    borderRadius: radii.sm,
  },
  saveBadgeText: {
    ...typography.caption,
    color: colors.card,
    fontWeight: '700',
  },
  planPrice: {
    ...typography.screenTitle,
    color: colors.textSoft,
  },
  planPriceSelected: {
    color: colors.text,
  },
  planSubtext: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing(1),
  },
  // ─── Bottom ────────────────────────────────
  bottom: {
    gap: spacing(3),
    alignItems: 'center',
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
