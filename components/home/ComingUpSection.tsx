import { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, spacing, radii, shadows, fonts } from '@/constants/theme';
import SectionLabel from './SectionLabel';
import type { Child } from '@/stores/childrenStore';

/**
 * Countdown to the next child birthday within 90 days.
 *
 * Shows an SVG progress ring that fills as the birthday
 * approaches, plus the child's name and the age they'll turn.
 * Hidden entirely when no birthday is within 90 days.
 */

const RING_SIZE = 44;
const RING_RADIUS = 17;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const MAX_DAYS = 90;

interface BirthdayInfo {
  child: Child;
  daysRemaining: number;
  turnsAge: number;
  nextBirthday: Date;
}

function getNextBirthday(child: Child): BirthdayInfo | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [birthYear, birthMonth, birthDay] = child.birthday.split('-').map(Number);
  const thisYear = today.getFullYear();

  // Try this year first, then next year
  let nextBday = new Date(thisYear, birthMonth - 1, birthDay);
  nextBday.setHours(0, 0, 0, 0);

  if (nextBday < today) {
    nextBday = new Date(thisYear + 1, birthMonth - 1, birthDay);
    nextBday.setHours(0, 0, 0, 0);
  }

  const diffMs = nextBday.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysRemaining > MAX_DAYS) return null;

  const turnsAge = nextBday.getFullYear() - birthYear;

  return { child, daysRemaining, turnsAge, nextBirthday: nextBday };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ComingUpSection({ children }: { children: Child[] }) {
  const nearest = useMemo(() => {
    let best: BirthdayInfo | null = null;
    for (const child of children) {
      const info = getNextBirthday(child);
      if (info && (!best || info.daysRemaining < best.daysRemaining)) {
        best = info;
      }
    }
    return best;
  }, [children]);

  if (!nearest) return null;

  const progress = (MAX_DAYS - nearest.daysRemaining) / MAX_DAYS;
  const strokeDashoffset = RING_CIRCUMFERENCE * (1 - progress);

  return (
    <View style={styles.container}>
      <SectionLabel label="Coming up" />
      <View style={styles.card}>
        <View style={styles.row}>
          {/* Countdown ring */}
          <View style={styles.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
              {/* Track */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={colors.border}
                strokeWidth={3}
              />
              {/* Progress */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                fill="none"
                stroke={colors.accent}
                strokeWidth={3}
                strokeLinecap="round"
                strokeDasharray={`${RING_CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                rotation={-90}
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>
            <Text style={styles.ringLabel}>{nearest.daysRemaining}d</Text>
          </View>

          {/* Text */}
          <View style={styles.textWrap}>
            <Text style={styles.milestone}>
              {nearest.child.name} turns {nearest.turnsAge}
            </Text>
            <Text style={styles.date}>
              {formatDate(nearest.nextBirthday)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing(4),
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.md,
    padding: spacing(3),
    ...shadows.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(3),
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '700',
    color: colors.accent,
  },
  textWrap: {
    flex: 1,
    gap: spacing(1),
  },
  milestone: {
    fontFamily: fonts.serif,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
  },
});
