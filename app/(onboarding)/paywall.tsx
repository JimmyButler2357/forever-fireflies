import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  hitSlop,
  minTouchTarget,
} from '@/constants/theme';
import { useAuthStore } from '@/stores/authStore';
import PrimaryButton from '@/components/PrimaryButton';

const VALUE_PROPS = [
  { icon: 'mic' as const, text: 'Unlimited voice & text memories' },
  { icon: 'cloud-done' as const, text: 'Recordings preserved forever' },
  { icon: 'search' as const, text: 'Search, organize, relive anytime' },
];

function getTrialEndDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setOnboarded = useAuthStore((s) => s.setOnboarded);
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('annual');

  const handleContinue = () => {
    setOnboarded();
    router.replace('/(main)/home');
  };

  return (
    <View style={styles.container}>
      {/* Dismiss button */}
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
          <Ionicons name="close" size={22} color={colors.textSoft} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>Keep every memory safe.</Text>

        {/* Value props */}
        <View style={styles.valueProps}>
          {VALUE_PROPS.map((prop) => (
            <View key={prop.text} style={styles.valuePropRow}>
              <View style={styles.valuePropIcon}>
                <Ionicons name={prop.icon} size={20} color={colors.accent} />
              </View>
              <Text style={styles.valuePropText}>{prop.text}</Text>
            </View>
          ))}
        </View>

        {/* Pricing cards */}
        <View style={styles.pricingRow}>
          {/* Monthly */}
          <Pressable
            onPress={() => setSelectedPlan('monthly')}
            style={[
              styles.pricingCard,
              selectedPlan === 'monthly' && styles.pricingCardSelected,
            ]}
          >
            <Text style={styles.planName}>Monthly</Text>
            <Text style={styles.planPrice}>$5.99</Text>
            <Text style={styles.planPeriod}>/month</Text>
          </Pressable>

          {/* Annual */}
          <Pressable
            onPress={() => setSelectedPlan('annual')}
            style={[
              styles.pricingCard,
              selectedPlan === 'annual' && styles.pricingCardSelected,
            ]}
          >
            <View style={styles.saveBadge}>
              <Text style={styles.saveBadgeText}>Save 30%</Text>
            </View>
            <Text style={styles.planName}>Annual</Text>
            <Text style={styles.planPrice}>$49.99</Text>
            <Text style={styles.planPeriod}>/year</Text>
            <Text style={styles.planBreakdown}>$4.17/mo</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(12) }]}>
        <PrimaryButton label="Start your free trial" onPress={handleContinue} />
        <Text style={styles.trialText}>
          7-day free trial · Ends {getTrialEndDate()}
        </Text>
        <Pressable onPress={handleContinue}>
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
    justifyContent: 'center',
  },
  heading: {
    ...typography.onboardingHeading,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(8),
  },
  valueProps: {
    gap: spacing(4),
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
  pricingRow: {
    flexDirection: 'row',
    gap: spacing(3),
  },
  pricingCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border,
    padding: spacing(4),
    alignItems: 'center',
    position: 'relative',
  },
  pricingCardSelected: {
    borderColor: colors.accent,
  },
  saveBadge: {
    position: 'absolute',
    top: -spacing(3),
    backgroundColor: colors.accent,
    paddingHorizontal: spacing(2),
    paddingVertical: spacing(1),
    borderRadius: radii.sm,
  },
  saveBadgeText: {
    ...typography.caption,
    color: colors.card,
    fontWeight: '700',
  },
  planName: {
    ...typography.formLabel,
    color: colors.textSoft,
    marginBottom: spacing(2),
    marginTop: spacing(1),
  },
  planPrice: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  planPeriod: {
    ...typography.caption,
    color: colors.textMuted,
  },
  planBreakdown: {
    ...typography.caption,
    color: colors.accent,
    marginTop: spacing(1),
  },
  bottom: {
    gap: spacing(3),
    alignItems: 'center',
    paddingBottom: spacing(12),
  },
  trialText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  restoreLink: {
    ...typography.timestamp,
    color: colors.textMuted,
  },
});
