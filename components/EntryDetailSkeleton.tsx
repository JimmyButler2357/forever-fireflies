import { View, StyleSheet } from 'react-native';
import { spacing, radii } from '@/constants/theme';
import Skeleton from '@/components/Skeleton';

const TRANSCRIPT_LINES: `${number}%`[] = ['100%', '96%', '88%', '64%'];

export default function EntryDetailSkeleton() {
  return (
    <View style={styles.container}>
      {/* Title */}
      <Skeleton width="60%" height={26} borderRadius={radii.sm} />

      {/* Gradient divider */}
      <Skeleton
        width="100%"
        height={3}
        borderRadius={2}
        style={styles.divider}
      />

      {/* Child pill */}
      <Skeleton
        width={90}
        height={22}
        borderRadius={radii.pill}
        style={styles.pill}
      />

      {/* Transcript lines */}
      <View style={styles.transcript}>
        {TRANSCRIPT_LINES.map((w, i) => (
          <Skeleton key={i} width={w} height={18} borderRadius={radii.sm} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing(5),
    paddingTop: spacing(2),
  },
  divider: {
    marginTop: spacing(2),
    marginBottom: spacing(2),
  },
  pill: {
    marginBottom: spacing(2),
  },
  transcript: {
    gap: spacing(2),
    marginTop: spacing(3),
  },
});
