import { useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle } from 'react-native-svg';
import { colors, spacing, radii, fonts } from '@/constants/theme';
import BannerFireflies, { type BannerFirefliesRef } from './BannerFireflies';

/**
 * Branding banner — the warm, whimsical hero card at the top
 * of the Home dashboard.
 *
 * Layers (bottom to top):
 * 1. Warm gradient background
 * 2. SVG jar illustration (hand-drawn sketch style)
 * 3. 12 animated firefly dots
 * 4. Tagline text overlay + memory count pill
 *
 * Tapping the banner scatters the fireflies — a little
 * Easter egg of delight.
 */

interface BrandingBannerProps {
  memoryCount: number;
}

export default function BrandingBanner({ memoryCount }: BrandingBannerProps) {
  const firefliesRef = useRef<BannerFirefliesRef>(null);

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => firefliesRef.current?.scatter()}
        style={({ pressed }) => [pressed && { opacity: 0.97 }]}
      >
        <LinearGradient
          colors={['#F5EDE3', '#EDE0D2', '#F0E6DC']}
          locations={[0, 0.5, 1]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.card}
        >
          {/* SVG jar illustration */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <JarScene />
          </View>

          {/* Animated firefly dots */}
          <BannerFireflies ref={firefliesRef} />

          {/* Text overlay */}
          <View style={styles.textOverlay}>
            <Text style={styles.tagline}>
              Your memories, kept{' '}
              <Text style={styles.taglineForever}>forever</Text>
            </Text>
            <Text style={styles.subtitle}>
              A journal for the moments that matter
            </Text>

            {/* Memory count pill */}
            <View style={styles.pill}>
              <View style={styles.glowDot} />
              <Text style={styles.pillText}>
                {memoryCount} {memoryCount === 1 ? 'memory' : 'memories'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/**
 * SVG jar scene — ported from the HTML playground.
 * Hand-drawn sketch of a jar with fireflies, grass, stars, and moon.
 */
function JarScene() {
  return (
    <Svg viewBox="0 0 343 140" style={styles.svg}>
      {/* Ground line */}
      <Path
        d="M0 128 C15 126,25 130,45 127 C65 124,85 129,105 126 C125 123,140 128,160 125 C180 122,200 127,220 124 C240 121,260 126,280 123 C300 120,320 125,343 122"
        stroke="#8C7E74" strokeWidth={0.8} strokeOpacity={0.18} strokeLinecap="round" fill="none"
      />
      {/* Grass tufts */}
      <Path d="M30 127 C32 120,34 118,33 127" stroke="#8C7E74" strokeWidth={0.6} strokeOpacity={0.12} strokeLinecap="round" fill="none" />
      <Path d="M35 128 C38 121,40 119,38 128" stroke="#8C7E74" strokeWidth={0.6} strokeOpacity={0.10} strokeLinecap="round" fill="none" />
      <Path d="M80 126 C82 119,85 117,83 126" stroke="#8C7E74" strokeWidth={0.6} strokeOpacity={0.11} strokeLinecap="round" fill="none" />
      <Path d="M85 127 C88 122,90 120,87 127" stroke="#8C7E74" strokeWidth={0.5} strokeOpacity={0.09} strokeLinecap="round" fill="none" />
      <Path d="M135 125 C136 119,139 116,137 125" stroke="#8C7E74" strokeWidth={0.6} strokeOpacity={0.10} strokeLinecap="round" fill="none" />
      <Path d="M290 123 C292 116,295 114,293 123" stroke="#8C7E74" strokeWidth={0.6} strokeOpacity={0.11} strokeLinecap="round" fill="none" />
      <Path d="M295 124 C298 119,300 117,297 124" stroke="#8C7E74" strokeWidth={0.5} strokeOpacity={0.09} strokeLinecap="round" fill="none" />

      {/* Jar lid */}
      <Path
        d="M255 58 C257 55,262 54,270 53 C278 52,288 53,293 55 C296 56,297 58,295 60 L253 60 C251 59,253 57,255 58Z"
        stroke="#8C7E74" strokeWidth={1.2} strokeOpacity={0.3} fill="#D4A07B" fillOpacity={0.08} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Jar handle */}
      <Path
        d="M268 53 C269 49,272 47,276 47 C280 47,282 49,283 53"
        stroke="#8C7E74" strokeWidth={1} strokeOpacity={0.25} fill="none" strokeLinecap="round"
      />
      {/* Jar body */}
      <Path
        d="M253 60 C250 62,247 68,245 76 C243 84,242 94,243 102 C244 110,248 118,254 122 C260 126,268 127,275 127 C282 127,290 126,296 122 C302 118,306 110,307 102 C308 94,307 84,305 76 C303 68,300 62,297 60"
        stroke="#8C7E74" strokeWidth={1.2} strokeOpacity={0.28} fill="#FAF8F5" fillOpacity={0.15} strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Jar highlight */}
      <Path d="M252 72 C251 80,251 90,253 100" stroke="white" strokeWidth={1.5} strokeOpacity={0.12} strokeLinecap="round" fill="none" />

      {/* Wing marks (jar) */}
      <Path d="M262 76 Q260 74 259 73" stroke="#8C7E74" strokeWidth={0.4} strokeOpacity={0.12} strokeLinecap="round" fill="none" />
      <Path d="M268 76 Q270 74 271 73" stroke="#8C7E74" strokeWidth={0.4} strokeOpacity={0.12} strokeLinecap="round" fill="none" />
      <Path d="M278 86 Q276 84 275 83" stroke="#8C7E74" strokeWidth={0.4} strokeOpacity={0.10} strokeLinecap="round" fill="none" />
      <Path d="M283 86 Q285 84 286 83" stroke="#8C7E74" strokeWidth={0.4} strokeOpacity={0.10} strokeLinecap="round" fill="none" />

      {/* Wing marks (free) */}
      <Path d="M47 28 Q45 26 44 25" stroke="#8C7E74" strokeWidth={0.4} strokeOpacity={0.10} strokeLinecap="round" fill="none" />
      <Path d="M53 28 Q55 26 56 25" stroke="#8C7E74" strokeWidth={0.4} strokeOpacity={0.10} strokeLinecap="round" fill="none" />
      <Path d="M207 43 Q205 41 204 40" stroke="#8C7E74" strokeWidth={0.4} strokeOpacity={0.10} strokeLinecap="round" fill="none" />
      <Path d="M213 43 Q215 41 216 40" stroke="#8C7E74" strokeWidth={0.4} strokeOpacity={0.10} strokeLinecap="round" fill="none" />

      {/* Firefly trails */}
      <Path d="M50 33 C48 38,45 42,47 48" stroke="#F2C94C" strokeWidth={0.5} strokeOpacity={0.10} strokeLinecap="round" strokeDasharray="2 3" fill="none" />
      <Path d="M25 73 Q23 78 26 83" stroke="#F2C94C" strokeWidth={0.4} strokeOpacity={0.08} strokeLinecap="round" strokeDasharray="2 3" fill="none" />
      <Path d="M140 21 Q142 25 139 29" stroke="#E8724A" strokeWidth={0.4} strokeOpacity={0.07} strokeLinecap="round" strokeDasharray="2 3" fill="none" />
      <Path d="M213 46 C218 48,225 50,232 52" stroke="#F2C94C" strokeWidth={0.5} strokeOpacity={0.10} strokeLinecap="round" strokeDasharray="2 3" fill="none" />

      {/* Stars */}
      <Path d="M180 12 L181 15 L184 15 L182 17 L183 20 L180 18 L177 20 L178 17 L176 15 L179 15Z" fill="#F2C94C" fillOpacity={0.12} />
      <Path d="M320 20 L321 22 L323 22 L321.5 23.5 L322 25.5 L320 24 L318 25.5 L318.5 23.5 L317 22 L319 22Z" fill="#F2C94C" fillOpacity={0.10} />
      <Circle cx={70} cy={15} r={0.8} fill="#F2C94C" fillOpacity={0.15} />
      <Circle cx={230} cy={25} r={0.6} fill="#F2C94C" fillOpacity={0.12} />

      {/* Crescent moon */}
      <Path d="M310 12 C314 8,320 8,322 14 C318 12,314 14,310 12Z" fill="#F2C94C" fillOpacity={0.10} stroke="#8C7E74" strokeWidth={0.5} strokeOpacity={0.10} />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: spacing(4),
  },
  card: {
    borderRadius: radii.lg,
    minHeight: 130,
    overflow: 'hidden',
    position: 'relative',
  },
  svg: {
    width: '100%',
    height: '100%',
  },
  textOverlay: {
    padding: spacing(6),
    paddingBottom: spacing(5),
    zIndex: 2,
  },
  tagline: {
    fontFamily: fonts.serif,
    fontSize: 16,
    color: colors.text,
  },
  taglineForever: {
    fontStyle: 'italic',
    color: colors.accent,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSoft,
    marginTop: spacing(1),
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing(2),
    backgroundColor: colors.tag,
    borderRadius: radii.full,
    paddingVertical: spacing(2),
    paddingHorizontal: spacing(4),
    marginTop: spacing(3),
  },
  glowDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.glow,
    shadowColor: colors.glow,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSoft,
  },
});
