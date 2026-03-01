import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, typography, spacing } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';

export default function LocationPermissionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleAllow = async () => {
    await Location.requestForegroundPermissionsAsync();
    // Navigate regardless of whether they granted or denied —
    // location is optional, we don't want to block onboarding
    router.push('/(onboarding)/notifications');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="location-outline" size={40} color={colors.accent} />
        </View>

        <Text style={styles.heading}>Tag where memories happen</Text>

        <Text style={styles.body}>
          We'll quietly note the location when you record — like writing the
          place on the back of a photo. You can always change or remove it.
        </Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(12) }]}>
        <PrimaryButton
          label="Allow location"
          onPress={handleAllow}
        />
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
    marginBottom: spacing(4),
  },
  body: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSoft,
    textAlign: 'center',
    lineHeight: 22.5,
    paddingHorizontal: spacing(4),
  },
  bottom: {
    paddingBottom: spacing(12),
  },
});
