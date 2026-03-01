import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Filter, FeTurbulence, FeColorMatrix, Rect } from 'react-native-svg';
import { radii } from '@/constants/theme';

interface PaperTextureProps {
  /** Border radius to match the parent card. Defaults to radii.lg (16). */
  radius?: number;
}

/**
 * Subtle fractal noise overlay for a journal/paper feel.
 * Renders an SVG noise pattern at 2.5% opacity.
 *
 * Applied to: entry cards, transcript areas, prompt cards, form cards.
 * NOT applied to: tabs, pills, buttons, settings rows.
 */
export default function PaperTexture({ radius = radii.lg }: PaperTextureProps) {
  return (
    <View style={[styles.container, { borderRadius: radius }]} pointerEvents="none">
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Filter id="noise" x="0%" y="0%" width="100%" height="100%">
            <FeTurbulence
              type="fractalNoise"
              baseFrequency={0.75}
              numOctaves={4}
              result="noise"
            />
            <FeColorMatrix type="saturate" values="0" />
          </Filter>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          filter="url(#noise)"
          opacity={0.025}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
});
