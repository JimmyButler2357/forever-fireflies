import { View, Text, Pressable, ScrollView, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, shadows, fonts, childColors, childColorWithOpacity } from '@/constants/theme';
import { getAge } from '@/lib/dateUtils';
import SectionLabel from './SectionLabel';
import type { Child } from '@/stores/childrenStore';
import type { PhotoState } from '@/lib/photoUrlCache';

/**
 * Family section — row of child avatars with names, ages,
 * and a total memory count pill below.
 *
 * Each avatar is tappable and opens the ChildModal with
 * detailed stats for that child.
 */

const AVATAR_SIZE = 72;
const RING_WIDTH = 3;

interface FamilySectionProps {
  children: Child[];
  onChildPress: (childId: string) => void;
  photoStates?: Record<string, PhotoState>;
  onRetryPhoto?: (childId: string) => void;
}

export default function FamilySection({
  children,
  onChildPress,
  photoStates = {},
  onRetryPhoto,
}: FamilySectionProps) {
  return (
    <View style={styles.container}>
      <SectionLabel label="Your family" />

      {/* Avatar row — scrolls horizontally when there are many children */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.avatarRow}
      >
        {children.map((child) => {
          const hex = childColors[child.colorIndex]?.hex ?? childColors[0].hex;
          // Default to 'none' if the effect hasn't populated state yet —
          // avoids a flash of undefined behavior on the very first render.
          const state: PhotoState = photoStates[child.id] ?? { status: 'none' };
          // Tapping an errored avatar retries the photo fetch instead of
          // opening the modal. Without this, users have no way to recover
          // from a transient network failure short of a full screen reload.
          const isError = state.status === 'error';
          const handlePress = isError && onRetryPhoto
            ? () => onRetryPhoto(child.id)
            : () => onChildPress(child.id);

          return (
            <Pressable
              key={child.id}
              onPress={handlePress}
              style={({ pressed }) => [
                styles.avatarColumn,
                pressed && { transform: [{ translateY: -2 }] },
              ]}
            >
              <View
                style={[
                  styles.avatar,
                  {
                    borderColor: hex,
                    backgroundColor: childColorWithOpacity(hex, 0.12),
                  },
                ]}
              >
                {state.status === 'loaded' ? (
                  <Image source={{ uri: state.url }} style={styles.avatarImage} />
                ) : state.status === 'loading' ? (
                  <ActivityIndicator size="small" color={hex} />
                ) : (
                  <Text style={[styles.avatarLetter, { color: hex }]}>
                    {child.name[0]}
                  </Text>
                )}
                {isError && (
                  <View style={styles.errorBadge}>
                    <Ionicons name="refresh" size={12} color={colors.card} />
                  </View>
                )}
              </View>
              <Text style={styles.name}>{child.name}</Text>
              <Text style={styles.age}>{getAge(child.birthday)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // No horizontal padding — ScrollView handles its own padding.
    // Pulls the next section up 8px so the gap below the age label
    // reads as 16px instead of the global 24px section break.
    marginBottom: -spacing(2),
  },
  avatarRow: {
    flexGrow: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: spacing(4),
    gap: spacing(6),
  },
  avatarColumn: {
    alignItems: 'center',
    gap: spacing(1),
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: RING_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  errorBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  avatarLetter: {
    fontFamily: fonts.serifBold,
    fontSize: 22,
  },
  name: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  age: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
