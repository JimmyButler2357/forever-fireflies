import { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { colors, spacing, radii, shadows, fonts, childColors } from '@/constants/theme';
import { formatDate, formatTime } from '@/lib/dateUtils';
import type { Entry } from '@/stores/entriesStore';
import type { Child } from '@/stores/childrenStore';

/**
 * Slide-up sheet showing entries for a tapped calendar day.
 *
 * Think of it like pulling open a drawer from the bottom
 * of the screen — it shows what happened on that day,
 * and you can tap any entry to see the full detail.
 * Drag it down or tap the backdrop to close it.
 *
 * Uses React Native's built-in Animated + PanResponder
 * (instead of Reanimated) because Modal creates a separate
 * native view hierarchy where gesture-handler doesn't
 * always work reliably.
 */

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.4;
const DISMISS_THRESHOLD = 80;

interface DayBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  date: string;
  entries: Entry[];
  childMap: Record<string, Child>;
}

export default function DayBottomSheet({
  visible,
  onClose,
  date,
  entries,
  childMap,
}: DayBottomSheetProps) {
  const router = useRouter();
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  // Slide in when visible becomes true
  useEffect(() => {
    if (visible) {
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const dismiss = () => {
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  // Drag-to-dismiss: track downward pan, dismiss if past threshold
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > DISMISS_THRESHOLD) {
          dismiss();
        } else {
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const handleEntryPress = (entryId: string) => {
    router.push({
      pathname: '/(main)/entry-detail',
      params: { entryId },
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={dismiss}
    >
      {/* Backdrop — tap to dismiss */}
      <Pressable style={styles.backdrop} onPress={dismiss}>
        {/* Stop taps on the sheet from closing it */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            {/* Drag handle */}
            <View style={styles.handleWrap}>
              <View style={styles.handle} />
            </View>

            {/* Header — date */}
            <Text style={styles.dateHeader}>
              {date ? formatDate(date, 'long') : ''}
            </Text>

            {/* Entry rows */}
            <ScrollView
              style={styles.scrollArea}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
            >
              {entries.map((entry) => {
                const firstChildId = entry.childIds[0];
                const child = firstChildId ? childMap[firstChildId] : null;
                const dotColor = child
                  ? childColors[child.colorIndex]?.hex ?? childColors[0].hex
                  : colors.textMuted;

                return (
                  <Pressable
                    key={entry.id}
                    onPress={() => handleEntryPress(entry.id)}
                    style={({ pressed }) => [
                      styles.entryRow,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <View
                      style={[styles.entryDot, { backgroundColor: dotColor }]}
                    />
                    <Text style={styles.entryTitle} numberOfLines={1}>
                      {entry.title || entry.text?.slice(0, 40) || 'Untitled'}
                    </Text>
                    {entry.createdAt && (
                      <Text style={styles.entryTime}>
                        {formatTime(entry.createdAt)}
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SHEET_HEIGHT,
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    ...shadows.lg,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: spacing(2),
    paddingBottom: spacing(1),
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    opacity: 0.3,
  },
  dateHeader: {
    fontFamily: fonts.serifBold,
    fontSize: 16,
    color: colors.text,
    paddingHorizontal: spacing(5),
    paddingTop: spacing(2),
    paddingBottom: spacing(3),
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing(5),
    paddingBottom: spacing(6),
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
    paddingVertical: spacing(3),
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  entryDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  entryTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  entryTime: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
