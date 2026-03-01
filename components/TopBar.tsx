import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, hitSlop } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface TopBarIcon {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightIcons?: TopBarIcon[];
  rightContent?: React.ReactNode;
  titleStyle?: 'serif' | 'sans';
}

/**
 * Reusable top navigation bar.
 * Left: optional back arrow. Center/left: title. Right: icon buttons.
 */
export default function TopBar({
  title,
  showBack = false,
  onBack,
  rightIcons = [],
  rightContent,
  titleStyle = 'sans',
}: TopBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing(3) }]}>
      <View style={styles.left}>
        {showBack && (
          <Pressable
            onPress={handleBack}
            hitSlop={hitSlop.icon}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        )}
        {title && (
          <Text
            style={[
              styles.title,
              titleStyle === 'serif' ? styles.titleSerif : styles.titleSans,
            ]}
          >
            {title}
          </Text>
        )}
      </View>

      <View style={styles.right}>
        {rightContent}
        {rightIcons.map((item, index) => (
          <Pressable
            key={index}
            onPress={item.onPress}
            hitSlop={hitSlop.icon}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && { opacity: 0.6 },
            ]}
          >
            <Ionicons name={item.icon} size={22} color={colors.text} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(3),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    flex: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
  },
  iconButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: colors.text,
  },
  titleSerif: {
    ...typography.appTitle,
  },
  titleSans: {
    ...typography.screenTitle,
  },
});
