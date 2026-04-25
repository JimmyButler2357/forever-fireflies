import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Image,
  Animated,
  PanResponder,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Alert,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { colors, spacing, typography } from '@/constants/theme';

// WYSIWYG circular cropper for child avatars.
//
// Why this exists: the OS native cropper shows a square frame, but child
// photos render as circles. The square frame doesn't communicate which
// corners get masked off, and there's no preview at the actual thumbnail
// size — so it's hard to judge zoom. This component shows the user
// exactly what the avatar will look like before they save.
//
// We use RN's PanResponder + Animated (not gesture-handler/Reanimated)
// because gestures inside Modal are unreliable on Android with the
// gesture-handler stack. See components/calendar/DayBottomSheet.tsx for
// the same pattern + reasoning.

type Props = {
  visible: boolean;
  sourceUri: string | null;
  onCancel: () => void;
  onConfirm: (croppedUri: string) => void;
};

const PREVIEW_SIZES = [52, 72] as const;
const MIN_USER_SCALE = 1;
const MAX_USER_SCALE = 4;

export default function PhotoCropper({ visible, sourceUri, onCancel, onConfirm }: Props) {
  const insets = useSafeAreaInsets();
  const screenWidth = Dimensions.get('window').width;
  // Cap circle at 280 so it leaves headroom for header + previews on
  // 360-wide phones. On larger phones we still keep 280 — a bigger
  // circle doesn't help framing accuracy, just visual presence.
  const circleDiameter = Math.min(280, screenWidth - spacing(8) * 2);

  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // Stage size — measured on layout so the SVG mask can render with
  // exact dimensions (the stage is `flex: 1` so we can't know up-front).
  const [stageSize, setStageSize] = useState<{ w: number; h: number } | null>(null);

  // Animated transforms applied to the image inside the crop stage.
  // translateX/Y is in screen pixels; scale is the *user-applied*
  // multiplier on top of baseCoverScale (initial cover-fit scale).
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const userScale = useRef(new Animated.Value(1)).current;

  // Mirror refs so PanResponder callbacks read the latest values
  // synchronously (Animated.Value has no synchronous getter).
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const sRef = useRef(1);

  // baseCoverScale: scale that makes the smaller image edge equal to
  // the circle diameter — i.e. "cover" fit. User scale starts at 1×
  // on top of this, so the image always fully covers the circle.
  const baseCoverScale = useMemo(() => {
    if (!imgSize) return 1;
    return circleDiameter / Math.min(imgSize.w, imgSize.h);
  }, [imgSize, circleDiameter]);

  // The PanResponder is created once on mount (via useRef) and its
  // callbacks capture closures from that first render. To avoid the
  // classic stale-closure bug — where clampTranslate sees imgSize as
  // null forever and pinning every drag to (0,0) — we mirror the
  // values we need into refs and read .current inside clampTranslate.
  const imgSizeRef = useRef<{ w: number; h: number } | null>(null);
  const baseCoverScaleRef = useRef(1);
  useEffect(() => {
    imgSizeRef.current = imgSize;
  }, [imgSize]);
  useEffect(() => {
    baseCoverScaleRef.current = baseCoverScale;
  }, [baseCoverScale]);

  // Reset transforms whenever a new source image loads.
  useEffect(() => {
    if (!visible) return;
    setImgSize(null);
    setIsProcessing(false);
    txRef.current = 0;
    tyRef.current = 0;
    sRef.current = 1;
    translateX.setValue(0);
    translateY.setValue(0);
    userScale.setValue(1);

    if (!sourceUri) return;
    Image.getSize(
      sourceUri,
      (w, h) => setImgSize({ w, h }),
      (err) => {
        console.warn('PhotoCropper: failed to read image size', err);
        Alert.alert('Could not read photo', 'Please try a different photo.');
        onCancel();
      },
    );
  }, [visible, sourceUri]);

  // Clamp translate so the image always fully covers the circle —
  // i.e. the user can't pan a transparent edge into the circle.
  // Reads imgSize / baseCoverScale through refs so the long-lived
  // PanResponder closure always sees the latest values, not the
  // initial-render snapshot when imgSize was still null.
  const clampTranslate = (
    tx: number,
    ty: number,
    s: number,
  ): { tx: number; ty: number } => {
    const sz = imgSizeRef.current;
    const cover = baseCoverScaleRef.current;
    if (!sz) return { tx: 0, ty: 0 };
    const displayedScale = cover * s;
    const displayedW = sz.w * displayedScale;
    const displayedH = sz.h * displayedScale;
    const maxTx = Math.max(0, (displayedW - circleDiameter) / 2);
    const maxTy = Math.max(0, (displayedH - circleDiameter) / 2);
    return {
      tx: Math.max(-maxTx, Math.min(maxTx, tx)),
      ty: Math.max(-maxTy, Math.min(maxTy, ty)),
    };
  };

  // Track gesture baseline. We re-baseline whenever the finger count
  // changes (1 ↔ 2) so transitioning from pan to pinch (or back)
  // doesn't cause a jump. Pan uses gestureState.dx/dy (RN's running
  // total since gesture start) — that's more reliable across iOS and
  // Android than reading raw nativeEvent.touches positions, which can
  // jitter or come back undefined mid-gesture on Android.
  type GestureBase = {
    fingerCount: number;
    gestureBaseDx: number;
    gestureBaseDy: number;
    startDist: number;
    baseTx: number;
    baseTy: number;
    baseScale: number;
  };
  const gestureBase = useRef<GestureBase | null>(null);

  const distance = (
    a: { pageX: number; pageY: number },
    b: { pageX: number; pageY: number },
  ): number => Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches as any;
        gestureBase.current = {
          fingerCount: touches.length,
          gestureBaseDx: gestureState.dx,
          gestureBaseDy: gestureState.dy,
          startDist:
            touches.length === 2 && touches[0] && touches[1]
              ? distance(touches[0], touches[1])
              : 0,
          baseTx: txRef.current,
          baseTy: tyRef.current,
          baseScale: sRef.current,
        };
      },
      onPanResponderMove: (evt, gestureState) => {
        const touches = evt.nativeEvent.touches as any;
        const base = gestureBase.current;
        if (!base) return;
        const fingerCount = touches.length;

        // Finger count changed — re-baseline using current values so
        // the next move continues smoothly from where we are now.
        if (base.fingerCount !== fingerCount) {
          base.fingerCount = fingerCount;
          base.gestureBaseDx = gestureState.dx;
          base.gestureBaseDy = gestureState.dy;
          base.baseTx = txRef.current;
          base.baseTy = tyRef.current;
          base.baseScale = sRef.current;
          base.startDist =
            fingerCount === 2 && touches[0] && touches[1]
              ? distance(touches[0], touches[1])
              : 0;
          return;
        }

        if (fingerCount === 1) {
          const dx = gestureState.dx - base.gestureBaseDx;
          const dy = gestureState.dy - base.gestureBaseDy;
          const clamped = clampTranslate(base.baseTx + dx, base.baseTy + dy, sRef.current);
          txRef.current = clamped.tx;
          tyRef.current = clamped.ty;
          translateX.setValue(clamped.tx);
          translateY.setValue(clamped.ty);
        } else if (fingerCount === 2 && base.startDist > 0 && touches[0] && touches[1]) {
          const newDist = distance(touches[0], touches[1]);
          let newScale = base.baseScale * (newDist / base.startDist);
          newScale = Math.max(MIN_USER_SCALE, Math.min(MAX_USER_SCALE, newScale));
          sRef.current = newScale;
          userScale.setValue(newScale);
          // Re-clamp translate — zooming out can push the image
          // past the bounds it was previously inside.
          const clamped = clampTranslate(txRef.current, tyRef.current, newScale);
          txRef.current = clamped.tx;
          tyRef.current = clamped.ty;
          translateX.setValue(clamped.tx);
          translateY.setValue(clamped.ty);
        }
      },
      onPanResponderRelease: () => {
        gestureBase.current = null;
      },
      onPanResponderTerminate: () => {
        gestureBase.current = null;
      },
    }),
  ).current;

  // Crop the source at full quality. compressPhoto runs after this at
  // the call site, applying the standard 1600 px / 0.8 quality pass.
  const handleConfirm = async () => {
    if (!sourceUri || !imgSize) return;
    setIsProcessing(true);
    try {
      const displayedScale = baseCoverScale * sRef.current;
      const cropSizeOnSource = circleDiameter / displayedScale;
      const displayedW = imgSize.w * displayedScale;
      const displayedH = imgSize.h * displayedScale;
      // origin = top-left of the crop rect, in source pixels.
      // displayedW/2 - tx is the screen x of the source's right edge
      // relative to its center; we want the crop's left edge.
      const originXOnDisplay = displayedW / 2 - txRef.current - circleDiameter / 2;
      const originYOnDisplay = displayedH / 2 - tyRef.current - circleDiameter / 2;
      let originX = originXOnDisplay / displayedScale;
      let originY = originYOnDisplay / displayedScale;
      let cropSize = cropSizeOnSource;
      // Floating-point math can spit out values a hair outside the
      // image. manipulateAsync rejects out-of-bounds crops, so clamp.
      originX = Math.max(0, Math.min(imgSize.w - cropSize, originX));
      originY = Math.max(0, Math.min(imgSize.h - cropSize, originY));
      cropSize = Math.min(cropSize, imgSize.w - originX, imgSize.h - originY);

      const result = await manipulateAsync(
        sourceUri,
        [
          {
            crop: {
              originX: Math.round(originX),
              originY: Math.round(originY),
              width: Math.round(cropSize),
              height: Math.round(cropSize),
            },
          },
        ],
        { compress: 1, format: SaveFormat.JPEG },
      );
      onConfirm(result.uri);
    } catch (err) {
      console.warn('PhotoCropper: crop failed', err);
      Alert.alert('Could not crop photo', 'Please try again.');
      setIsProcessing(false);
    }
  };

  // The image transform: cover-scale times user scale, plus pan.
  // We stack the scales as separate transform entries so RN can apply
  // them in order (translate first, then scale around the center).
  const animatedImageStyle = {
    transform: [
      { translateX },
      { translateY },
      { scale: Animated.multiply(userScale, baseCoverScale) },
    ],
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* Header — Cancel + Use photo. The middle title felt redundant
            (the circular cutout makes the screen's purpose obvious) so
            we let the buttons sit on opposite ends with `space-between`. */}
        <View style={[styles.header, { paddingTop: insets.top + spacing(3) }]}>
          <Pressable
            onPress={onCancel}
            disabled={isProcessing}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            hitSlop={12}
          >
            <Text style={styles.headerBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleConfirm}
            disabled={isProcessing || !imgSize}
            style={({ pressed }) => [
              styles.headerBtn,
              pressed && styles.headerBtnPressed,
              (isProcessing || !imgSize) && styles.headerBtnDisabled,
            ]}
            hitSlop={12}
          >
            <Text style={[styles.headerBtnText, styles.headerBtnAccent]}>Use photo</Text>
          </Pressable>
        </View>

        {/* Crop stage */}
        <View
          style={styles.stage}
          {...panResponder.panHandlers}
          onLayout={(e: LayoutChangeEvent) => {
            const { width, height } = e.nativeEvent.layout;
            setStageSize({ w: width, h: height });
          }}
        >
          {imgSize && sourceUri ? (
            <Animated.Image
              source={{ uri: sourceUri }}
              style={[
                {
                  position: 'absolute',
                  width: imgSize.w,
                  height: imgSize.h,
                  left: (screenWidth - imgSize.w) / 2,
                  top: '50%',
                  marginTop: -imgSize.h / 2,
                },
                animatedImageStyle,
              ]}
              resizeMode="cover"
            />
          ) : (
            <ActivityIndicator color="#FFFFFF" />
          )}

          {/* Dim everything OUTSIDE the circle. SVG with even-odd fill
              draws a screen-sized rect and subtracts the inscribed
              circle — leaving the inside untouched. */}
          {stageSize && (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <CircleMask
                width={stageSize.w}
                height={stageSize.h}
                diameter={circleDiameter}
              />
            </View>
          )}

          {/* Hint copy */}
          <View pointerEvents="none" style={styles.hintWrap}>
            <Text style={styles.hint}>Drag to move · Pinch to zoom</Text>
          </View>
        </View>

        {/* Live preview row — shows the cropped circle at the actual
            sizes used in the home screen + child modal. We add the
            bottom safe-area inset so it stays clear of the device's
            gesture/nav bar. */}
        <View style={[styles.previewRow, { paddingBottom: insets.bottom + spacing(4) }]}>
          <Text style={styles.previewLabel}>How it'll look:</Text>
          <View style={styles.previewSizes}>
            {PREVIEW_SIZES.map((size) => (
              <LivePreview
                key={size}
                size={size}
                circleDiameter={circleDiameter}
                imgSize={imgSize}
                sourceUri={sourceUri}
                translateX={translateX}
                translateY={translateY}
                userScale={userScale}
                baseCoverScale={baseCoverScale}
                screenWidth={screenWidth}
              />
            ))}
          </View>
        </View>

        {isProcessing && (
          <View style={styles.processingOverlay} pointerEvents="auto">
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Circle mask ──────────────────────────────────────────
// SVG path with even-odd fill: outer rect minus inscribed circle.
// The dim only fills the area outside the circle — the inside stays
// fully transparent so the user sees the un-altered photo there. A
// thin white circle is drawn on top so the boundary is visible.

function CircleMask({
  width,
  height,
  diameter,
}: {
  width: number;
  height: number;
  diameter: number;
}) {
  const r = diameter / 2;
  const cx = width / 2;
  const cy = height / 2;
  // Outer rect path (clockwise) + inner circle path (one side at a
  // time using two SVG arc commands). With fillRule="evenodd", the
  // inner circle subtracts from the outer rect.
  const d = [
    `M0,0`,
    `H${width}`,
    `V${height}`,
    `H0`,
    `Z`,
    `M${cx - r},${cy}`,
    `a${r},${r} 0 1,0 ${2 * r},0`,
    `a${r},${r} 0 1,0 ${-2 * r},0`,
    `Z`,
  ].join(' ');
  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Path d={d} fill="rgba(0,0,0,0.55)" fillRule="evenodd" />
      {/* Thin white ring so the circle boundary reads clearly */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        stroke="rgba(255,255,255,0.85)"
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
}

// ─── Live preview ─────────────────────────────────────────
// Renders the same image with the same transforms, scaled down to
// `size` px diameter. Implemented by wrapping the image stack in a
// scale-down transform — the math stays consistent without any
// extra coupling to the parent's animated values.

type LivePreviewProps = {
  size: number;
  circleDiameter: number;
  imgSize: { w: number; h: number } | null;
  sourceUri: string | null;
  translateX: Animated.Value;
  translateY: Animated.Value;
  userScale: Animated.Value;
  baseCoverScale: number;
  screenWidth: number;
};

function LivePreview({
  size,
  circleDiameter,
  imgSize,
  sourceUri,
  translateX,
  translateY,
  userScale,
  baseCoverScale,
  screenWidth,
}: LivePreviewProps) {
  const ratio = size / circleDiameter;
  const composedScale = Animated.multiply(userScale, baseCoverScale * ratio);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.25)',
      }}
    >
      {imgSize && sourceUri ? (
        <Animated.Image
          source={{ uri: sourceUri }}
          style={{
            position: 'absolute',
            width: imgSize.w,
            height: imgSize.h,
            // Center of the image starts at the center of the preview circle.
            left: size / 2 - imgSize.w / 2,
            top: size / 2 - imgSize.h / 2,
            transform: [
              { translateX: Animated.multiply(translateX, ratio) },
              { translateY: Animated.multiply(translateY, ratio) },
              { scale: composedScale },
            ],
          }}
          resizeMode="cover"
        />
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    // paddingTop is added at render time using safe-area insets so
    // the buttons sit clear of the status bar / notch.
    paddingHorizontal: spacing(4),
    paddingBottom: spacing(3),
  },
  headerBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: spacing(2),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnPressed: { opacity: 0.6 },
  headerBtnDisabled: { opacity: 0.4 },
  headerBtnText: {
    ...typography.buttonLabel,
    color: '#FFFFFF',
  },
  headerBtnAccent: {
    color: colors.accent,
  },
  stage: {
    flex: 1,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hintWrap: {
    position: 'absolute',
    bottom: spacing(4),
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  hint: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.75)',
  },
  previewRow: {
    paddingHorizontal: spacing(6),
    paddingTop: spacing(4),
    paddingBottom: spacing(8),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing(4),
  },
  previewLabel: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.65)',
  },
  previewSizes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(4),
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
