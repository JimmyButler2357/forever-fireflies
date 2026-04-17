import { View, Text, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import { colors, spacing, shadows, fonts, childColors, childColorWithOpacity } from '@/constants/theme';
import { getAge } from '@/lib/dateUtils';
import SectionLabel from './SectionLabel';
import type { Child } from '@/stores/childrenStore';

/**
 * Family section — row of child avatars with names, ages,
 * and a total memory count pill below.
 *
 * Each avatar is tappable and opens the ChildModal with
 * detailed stats for that child.
 */

const AVATAR_SIZE = 52;
const RING_WIDTH = 3;

interface FamilySectionProps {
  children: Child[];
  onChildPress: (childId: string) => void;
  photoUrls?: Record<string, string | undefined>;
}

export default function FamilySection({ children, onChildPress, photoUrls = {} }: FamilySectionProps) {
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
          return (
            <Pressable
              key={child.id}
              onPress={() => onChildPress(child.id)}
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
                {photoUrls[child.id] ? (
                  <Image source={{ uri: photoUrls[child.id] }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarLetter, { color: hex }]}>
                    {child.name[0]}
                  </Text>
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
    // No horizontal padding — ScrollView handles its own padding
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
