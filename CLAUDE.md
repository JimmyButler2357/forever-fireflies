# Core Memories — Project Instructions

**Session prefix: CM**

## Design System

**Before doing any UI work**, read `/docs/design/design-style.md`. It is the source of truth for all visual implementation.

### Quick-Reference Rules

- **Colors**: Always use theme tokens — never hardcode hex values in components
- **Typography**: 5 sizes only — 22 / 16 / 14 / 12 / 11. No in-between values. Serif (`Georgia`) only for app title + entry body text
- **Spacing**: 4px grid — every margin, padding, and gap must be divisible by 4. Common values: 4, 8, 12, 16, 20, 24, 32, 48
- **Border radius**: 4 tiers only — sm(8) / md(12) / lg(16) / full(9999). No other values
- **Shadows**: 3 levels (sm/md/lg) + accent glow. Always warm brown base `rgba(44,36,32,...)`, never black
- **Touch targets**: Minimum 44×44px hit area on all interactive elements
- **Transitions**: Maximum 300ms for user-initiated actions. Respect `prefers-reduced-motion`
- **Screen states**: Every screen must handle empty, loading, and error states — never show blank screens
