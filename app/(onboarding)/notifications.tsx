import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, radii } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';

const TIMES = [
  '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
  '9:00 PM', '9:30 PM', '10:00 PM',
];

const DEFAULT_TIME = '8:30 PM';

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedTime, setSelectedTime] = useState(DEFAULT_TIME);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="notifications" size={36} color={colors.accent} />
        </View>

        <Text style={styles.heading}>A gentle nudge at bedtime.</Text>

        <View style={styles.timeList}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {TIMES.map((time) => {
              const isSelected = time === selectedTime;
              return (
                <Pressable
                  key={time}
                  onPress={() => setSelectedTime(time)}
                  style={[styles.timeRow, isSelected && styles.timeRowSelected]}
                >
                  <Text style={[styles.timeText, isSelected && styles.timeTextSelected]}>
                    {time}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(12) }]}>
        <PrimaryButton
          label="Set reminder"
          onPress={() => router.push('/(onboarding)/first-recording')}
        />
        <Pressable onPress={() => router.push('/(onboarding)/first-recording')}>
          <Text style={styles.skipLink}>Not now</Text>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing(6),
  },
  heading: {
    ...typography.sectionHeading,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing(6),
  },
  timeList: {
    width: '100%',
    maxHeight: 280,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(2),
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing(3),
    paddingHorizontal: spacing(4),
    borderRadius: radii.md,
  },
  timeRowSelected: {
    backgroundColor: colors.accentSoft,
  },
  timeText: {
    ...typography.formLabel,
    color: colors.textSoft,
  },
  timeTextSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  bottom: {
    gap: spacing(4),
    alignItems: 'center',
    paddingBottom: spacing(12),
  },
  skipLink: {
    ...typography.formLabel,
    color: colors.textMuted,
  },
});
