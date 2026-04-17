import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  colors,
  spacing,
  radii,
  shadows,
  fonts,
} from '@/constants/theme';
import { ageInMonths } from '@/lib/dateUtils';
import { promptsService, getTodaysChildIndex } from '@/services/prompts.service';
import { useSubscription } from '@/hooks/useSubscription';
import PostTrialPaywall from '@/components/PostTrialPaywall';
import SectionLabel from './SectionLabel';
import type { Child } from '@/stores/childrenStore';

// Birthday prompts — special messages for a child's birthday.
// Single-child uses {child_name}; multi-birthday is generic so
// we don't have to awkwardly pick one twin over another.
const BIRTHDAY_PROMPT_SINGLE = "It's {child_name}'s birthday! What's your favorite memory from this past year?";
const BIRTHDAY_PROMPT_MULTI = "It's a birthday in the family! What's your favorite memory from this past year?";

/** Check which children have a birthday today by comparing MM-DD.
 *  Think of it like checking a wall calendar — we only care about
 *  the month and day, not the year they were born. */
function getBirthdayChildren(kids: Child[]): Child[] {
  const now = new Date();
  const todayMD =
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
  return kids.filter((c) => c.birthday.slice(5) === todayMD);
}

/**
 * Daily prompt card — surfaces an age-appropriate recording prompt
 * and provides quick actions to record, write, or explore more prompts.
 *
 * Child rotation: each day a different child is "featured" (like
 * taking turns at a board game). On a child's birthday, they always
 * get featured. If multiple kids share a birthday (twins!), the
 * prompt switches to a generic birthday message so nobody feels
 * left out.
 */

interface TodaysPromptCardProps {
  profileId: string | undefined;
  children: Child[];
}

export default function TodaysPromptCard({ profileId, children }: TodaysPromptCardProps) {
  const router = useRouter();
  const { hasAccess } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);
  const [prompt, setPrompt] = useState<{ id: string; text: string } | null>(null);

  // --- Pick today's featured child ---
  // Priority: birthday child > daily rotation > first child
  const birthdayKids = getBirthdayChildren(children);
  const isBirthday = birthdayKids.length > 0;
  const isMultiBirthday = birthdayKids.length > 1;

  let featuredChild: Child | null = null;
  if (isBirthday && !isMultiBirthday) {
    // One birthday kid — they're the star today
    featuredChild = birthdayKids[0];
  } else if (!isBirthday && children.length > 0) {
    // Normal day — rotate through kids
    featuredChild = children[getTodaysChildIndex(children.length)];
  } else if (children.length > 0) {
    // Multi-birthday — use first birthday kid for age filter,
    // but the prompt text will be generic (no specific name)
    featuredChild = birthdayKids[0];
  }

  useEffect(() => {
    if (!profileId) return;

    // On birthdays, use the special birthday prompt directly
    // instead of fetching from the database
    if (isBirthday) {
      const text = isMultiBirthday ? BIRTHDAY_PROMPT_MULTI : BIRTHDAY_PROMPT_SINGLE;
      setPrompt({ id: 'birthday', text });
      return;
    }

    const months = featuredChild ? ageInMonths(featuredChild.birthday) : undefined;

    promptsService
      .getDailyPrompts(profileId, 1, months, featuredChild?.id)
      .then((prompts) => {
        if (prompts.length > 0) setPrompt(prompts[0]);
      })
      .catch((err) => console.warn('Failed to load daily prompt:', err));
  }, [profileId, featuredChild?.id, isBirthday]);

  // Substitute {child_name} placeholder.
  // Multi-birthday uses "your little ones" since we can't pick just one name.
  const childLabel = isMultiBirthday
    ? 'your little ones'
    : featuredChild?.name ?? 'your little one';

  const displayText = prompt
    ? prompt.text.replace(/\{child_name\}/g, childLabel)
    : 'What made you smile today?';

  const handleMic = () => {
    if (!hasAccess) {
      setShowPaywall(true);
      return;
    }
    if (prompt) {
      promptsService.recordPromptShown(profileId!, prompt.id, 'recording_screen');
    }
    router.push('/(main)/recording');
  };

  const handleWrite = () => {
    if (!hasAccess) {
      setShowPaywall(true);
      return;
    }
    router.push({ pathname: '/(main)/entry-detail', params: { transcript: '' } });
  };

  const handleExplore = () => {
    router.push('/(main)/prompts');
  };

  return (
    <View style={styles.container}>
      <SectionLabel label="Today's prompt" />

      <View style={styles.card}>
        {/* Prompt body — text + mic button */}
        <View style={styles.body}>
          <Text style={styles.promptText}>{displayText}</Text>
          <Pressable
            onPress={handleMic}
            style={({ pressed }) => [
              styles.micButton,
              pressed && { opacity: 0.85 },
            ]}
          >
            <Ionicons name="mic" size={20} color={colors.card} />
          </Pressable>
        </View>

        {/* Footer — write + explore links */}
        <View style={styles.separator} />
        <View style={styles.footer}>
          <Pressable onPress={handleWrite} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={styles.writeText}>
              or <Text style={styles.writeAccent}>write instead</Text>
            </Text>
          </Pressable>
          <Pressable onPress={handleExplore} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <Text style={styles.exploreText}>explore more prompts ›</Text>
          </Pressable>
        </View>
      </View>

      <PostTrialPaywall visible={showPaywall} onClose={() => setShowPaywall(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing(4),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    padding: spacing(4),
    ...shadows.promptCard,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
  },
  promptText: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.text,
    lineHeight: 27,
  },
  micButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing(3),
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing(3),
  },
  writeText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
  },
  writeAccent: {
    color: colors.accent,
  },
  exploreText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.accent,
  },
});
