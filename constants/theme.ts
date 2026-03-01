/**
 * Core Memories — Design Tokens
 *
 * Single source of truth for all visual values.
 * Never hardcode hex values in components — always import from here.
 *
 * Reference: /docs/design/design-style.md
 */

// ─── Colors ──────────────────────────────────────────────

export const colors = {
  bg: '#FAF8F5',
  card: '#FFFFFF',
  text: '#2C2420',
  textSoft: '#8C7E74',
  textMuted: '#B5AAA0',
  accent: '#E8724A',
  accentSoft: '#FFF0EB',
  accentPressed: '#D4613B',
  accentGlow: 'rgba(232,114,74,0.12)',
  heartFilled: '#E8724A',
  heartEmpty: '#D9D2CB',
  border: '#EDE8E3',
  tag: '#F3EDE8',
  success: '#4CAF7C',
  successSoft: '#E8F5EE',
  warning: '#E8A94A',
  warningSoft: '#FFF5E6',
  danger: '#D94F4F',
  overlay: 'rgba(44,36,32,0.45)',
  general: '#B5AAA0',
  cardPressed: '#F7F4F1',
} as const;

// Screen-specific colors
export const screenColors = {
  coreMemoriesBg: '#F9F2EB',
  notificationBg: '#F5F0EB',
  recordingBackdrop: 'rgba(244,226,214,0.45)',
} as const;

// ─── Per-Child Colors ────────────────────────────────────

export const childColors = [
  { name: 'Blue', hex: '#7BAFD4' },
  { name: 'Amber', hex: '#D4A07B' },
  { name: 'Green', hex: '#9BC49B' },
  { name: 'Plum', hex: '#B88BB4' },
  { name: 'Teal', hex: '#6BB5A8' },
  { name: 'Rose', hex: '#D48B8B' },
] as const;

/**
 * Convert a hex color to rgba with a given opacity.
 * Used for child pill backgrounds (12%), tab fills (25%), etc.
 *
 * Example: childColorWithOpacity('#7BAFD4', 0.12) → 'rgba(123,175,212,0.12)'
 */
export function childColorWithOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${opacity})`;
}

// ─── Typography ──────────────────────────────────────────

/**
 * Two font families:
 * - Merriweather (serif): journal voice — titles, transcripts, prompts, headings
 * - System default (undefined): app voice — UI chrome, labels, buttons, tags
 *
 * On React Native, `undefined` uses the platform default (San Francisco on iOS,
 * Roboto on Android).
 *
 * Merriweather weights are loaded as named fonts via expo-font in _layout.tsx.
 * Each weight is a separate font file, so we reference them by their loaded name.
 */
export const fonts = {
  serif: 'Merriweather_400Regular',
  serifBold: 'Merriweather_700Bold',
  serifBlack: 'Merriweather_900Black',
  sans: undefined,
};

/**
 * Named typography presets. Each combines family, size, weight, and optional
 * line-height / letter-spacing into a style object ready to spread.
 */
export const typography = {
  // App title — Sign In screen (largest)
  appTitleLarge: {
    fontFamily: fonts.serifBlack,
    fontSize: 28,
    letterSpacing: -0.5,
  },
  // App title — Home screen header
  appTitle: {
    fontFamily: fonts.serifBlack,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  // Onboarding step headings (Memory Saved, Paywall)
  onboardingHeading: {
    fontFamily: fonts.serifBold,
    fontSize: 20,
  },
  // Section headings (Add Child, Mic Permission, Notifications)
  sectionHeading: {
    fontFamily: fonts.serifBold,
    fontSize: 18,
  },
  // Prompt card text on Recording screen
  promptCard: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 27,
  },
  // Core Memories screen title
  coreMemoriesTitle: {
    fontFamily: fonts.serifBold,
    fontSize: 17,
    letterSpacing: 0.3,
  },
  // Screen titles (Search, Settings — system sans)
  screenTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  // Transcript body text in Entry Detail
  transcript: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24.75, // 15 * 1.65
  },
  // Core Memories card preview text
  coreMemoriesPreview: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24, // 15 * 1.6
  },
  // Onboarding tagline / subtitle
  onboardingTagline: {
    fontSize: 15,
    fontWeight: '400' as const,
  },
  // Entry card preview text (Home / Search)
  entryPreview: {
    fontFamily: fonts.serif,
    fontSize: 14.5,
    lineHeight: 22.5, // ~1.55
  },
  // Form labels, input text
  formLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  // Child pill names, banner text
  pillLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  // Child tab labels
  tabLabel: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  // Primary button text
  buttonLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
  },
  // Timestamps, section headers (uppercase + tracking)
  timestamp: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  // Tags, audio timestamps, tiny metadata
  tag: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  // Captions, age lines, hints
  caption: {
    fontSize: 11,
    fontWeight: '500' as const,
  },
  // Date/time on cards, audio duration
  cardMeta: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
} as const;

// ─── Spacing ─────────────────────────────────────────────

/**
 * 4px grid spacing function.
 * Every margin, padding, and gap must be divisible by 4.
 *
 * Usage: spacing(1) = 4, spacing(2) = 8, spacing(3) = 12, etc.
 */
export const spacing = (n: number): number => n * 4;

/** Named spacing tokens for common assignments */
export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 48,
} as const;

// ─── Border Radius ───────────────────────────────────────

export const radii = {
  sm: 8,     // Tags, small badges
  md: 12,    // Child pills, inputs, banners
  card: 14,  // Entry cards, form cards, primary buttons, pickers
  lg: 16,    // Large cards (Core Memories, first-entry glow), modals, confirm dialogs
  full: 9999, // Circular elements, filter chips
  pill: 20,  // Child tabs (rendered as 20px)
} as const;

// ─── Shadows ─────────────────────────────────────────────

/**
 * All shadows use warm brown rgba(44,36,32,...) — never pure black.
 * React Native shadow properties (iOS). Android uses `elevation`.
 */
export const shadows = {
  sm: {
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 3,
  },
  lg: {
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 40,
    elevation: 8,
  },
  // Extended shadows for specific components
  tabInactive: {
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  promptCard: {
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  micButtonHome: {
    shadowColor: '#E8724A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 4,
  },
  modal: {
    shadowColor: '#2C2420',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.20,
    shadowRadius: 40,
    elevation: 8,
  },
} as const;

// ─── Animation Durations ─────────────────────────────────

export const durations = {
  buttonPress: 100,
  colorChange: 150,
  cardPress: 150,
  modalEnter: 200,
  modalExit: 150,
  screenTransition: 250,
  max: 300, // Maximum for any user-initiated transition
  skeletonShimmer: 1500,
} as const;

// ─── Touch Targets ───────────────────────────────────────

export const hitSlop = {
  /** Expand a small icon (20-24px) to meet the 44px minimum */
  icon: { top: 12, right: 12, bottom: 12, left: 12 },
} as const;

export const minTouchTarget = 44;
