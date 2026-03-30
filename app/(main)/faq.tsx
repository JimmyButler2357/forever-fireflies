import { useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  typography,
  spacing,
  radii,
  shadows,
  minTouchTarget,
  durations,
} from '@/constants/theme';
import TopBar from '@/components/TopBar';
import { useReduceMotion } from '@/hooks/useReduceMotion';

// ─── Types ──────────────────────────────────────────────

interface FaqQuestion {
  question: string;
  answer: string;
}

interface FaqSection {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  questions: FaqQuestion[];
}

// ─── FAQ Content ────────────────────────────────────────

const FAQ_DATA: FaqSection[] = [
  {
    title: 'Recording Memories',
    icon: 'mic-outline',
    questions: [
      {
        question: 'How do I record a memory?',
        answer:
          'Tap the mic, talk for up to 60 seconds, and you\'re done. Your words are transcribed so you can read them back anytime. If you have more to say, tap "Keep Going" when the timer ends. You can go up to 3 minutes.',
      },
      {
        question: 'Can I type instead of speaking?',
        answer:
          'Yes. Tap "or write instead" below the mic button. Voice is the main way to capture, but writing is always there.',
      },
      {
        question: 'Can I re-record a memory?',
        answer:
          'Yes. Open any voice entry and tap the mic icon on the playback bar. Your new recording replaces the old one, but everything else stays as it was: children, tags, date, location.',
      },
      {
        question: 'Can I edit my transcript?',
        answer:
          'Yes, anytime. Your original audio is always kept alongside the text, so nothing is ever lost.',
      },
    ],
  },
  {
    title: 'Tags & Organization',
    icon: 'pricetag-outline',
    questions: [
      {
        question: 'How do tags work?',
        answer:
          'When you save an entry, the app suggests tags based on what you said, things like "funny," "milestone," or "bedtime." You can add your own too.',
      },
    ],
  },
  {
    title: 'Firefly Jar',
    icon: 'heart-outline',
    questions: [
      {
        question: "What's the Firefly Jar?",
        answer:
          'Your favorite memories, all in one place. Tap the heart on any entry to save it as a firefly, a moment you never want to lose.',
      },
      {
        question: 'How do I save a memory to the Firefly Jar?',
        answer:
          "Tap the heart on any entry card or on the detail screen. That's it.",
      },
    ],
  },
  {
    title: 'Children & Family',
    icon: 'people-outline',
    questions: [
      {
        question: 'How many children can I add?',
        answer:
          'Up to 15. Each child gets their own tab on the home screen so their memories stay organized by who the moment was about.',
      },
      {
        question: 'Can my partner use the app too?',
        answer:
          "Not yet, but we're working on it. The plan is for both parents to journal together on one plan.",
      },
    ],
  },
  {
    title: 'Privacy & Your Data',
    icon: 'shield-checkmark-outline',
    questions: [
      {
        question: 'Is my data private?',
        answer:
          'Yes. Your recordings and entries are kept safe and never shared or sold.',
      },
      {
        question: 'Does AI change my words?',
        answer:
          'Never. AI helps behind the scenes, suggesting a title and tags, but your voice and your words stay exactly as you said them.',
      },
      {
        question: 'What if I delete an entry?',
        answer:
          'It moves to a 30-day recovery window. During that time you can restore it from Settings if you change your mind. After 30 days, the entry and its audio are permanently removed.',
      },
    ],
  },
  {
    title: 'Subscription',
    icon: 'card-outline',
    questions: [
      {
        question: 'What happens after my free trial?',
        answer:
          "You can still see your entries and browse your timeline, but recording, editing, and audio playback need a subscription. Your memories are never deleted. They'll be there when you're ready.",
      },
      {
        question: 'Can I cancel anytime?',
        answer:
          "Yes, through your device's app store settings.",
      },
    ],
  },
];

// ─── Accordion Item ─────────────────────────────────────

interface FaqItemProps {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  isLast: boolean;
  reduceMotion: boolean;
}

function FaqItem({
  question,
  answer,
  isOpen,
  onToggle,
  isLast,
  reduceMotion,
}: FaqItemProps) {
  const measuredHeight = useRef(0);
  const heightAnim = useSharedValue(0);
  const chevronRotation = useSharedValue(0);

  const animDuration = reduceMotion ? 0 : durations.modalEnter;

  const handleToggle = useCallback(() => {
    const opening = !isOpen;
    heightAnim.value = withTiming(
      opening ? measuredHeight.current : 0,
      { duration: animDuration },
    );
    chevronRotation.value = withTiming(
      opening ? 1 : 0,
      { duration: animDuration },
    );
    onToggle();
  }, [isOpen, animDuration, onToggle]);

  const bodyStyle = useAnimatedStyle(() => ({
    height: heightAnim.value,
    overflow: 'hidden' as const,
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value * 180}deg` }],
  }));

  return (
    <>
      <Pressable
        onPress={handleToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        style={({ pressed }) => [
          styles.questionRow,
          pressed && { backgroundColor: colors.cardPressed },
        ]}
      >
        <Text style={styles.questionText}>{question}</Text>
        <Animated.View style={chevronStyle}>
          <Ionicons
            name="chevron-down"
            size={16}
            color={colors.textMuted}
          />
        </Animated.View>
      </Pressable>

      <Animated.View style={bodyStyle}>
        <View
          onLayout={(e) => {
            const h = e.nativeEvent.layout.height;
            if (h > 0) measuredHeight.current = h;
          }}
          style={styles.answerMeasure}
        >
          <Text style={styles.answerText}>{answer}</Text>
        </View>
      </Animated.View>

      {!isLast && <View style={styles.divider} />}
    </>
  );
}

// ─── Screen ─────────────────────────────────────────────

export default function FaqScreen() {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = useCallback((key: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return (
    <View style={styles.container}>
      <TopBar title="FAQ & Tour" showBack />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing(8) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {FAQ_DATA.map((section, sIdx) => (
          <View key={section.title}>
            {/* Section header */}
            <View
              style={[
                styles.sectionHeader,
                sIdx === 0 && { marginTop: spacing(2) },
              ]}
            >
              <Ionicons
                name={section.icon}
                size={18}
                color={colors.accent}
              />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>

            {/* Question card */}
            <View style={[styles.card, shadows.sm]}>
              {section.questions.map((q, qIdx) => {
                const key = `${sIdx}-${qIdx}`;
                return (
                  <FaqItem
                    key={key}
                    question={q.question}
                    answer={q.answer}
                    isOpen={openItems.has(key)}
                    onToggle={() => toggleItem(key)}
                    isLast={qIdx === section.questions.length - 1}
                    reduceMotion={reduceMotion}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(4),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(2),
    marginTop: spacing(6),
    marginBottom: spacing(3),
  },
  sectionTitle: {
    ...typography.sectionHeading,
    color: colors.text,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.card,
    overflow: 'hidden',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: minTouchTarget,
    paddingHorizontal: spacing(4),
    paddingVertical: spacing(3),
  },
  questionText: {
    ...typography.formLabel,
    color: colors.text,
    flex: 1,
    marginRight: spacing(2),
  },
  answerMeasure: {
    position: 'absolute',
    width: '100%',
  },
  answerText: {
    fontSize: 14,
    color: colors.textSoft,
    lineHeight: 21,
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(4),
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing(4),
  },
});
