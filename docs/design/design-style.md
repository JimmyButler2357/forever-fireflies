# Core Memories — Design Style Guide (v3)

Updated to merge the Design System Principles into a single source of truth. This document captures the visual language as built — not aspirational, but actual patterns extracted from the working wireframe. Every component, screen, and style must conform to this guide. When in doubt, reference this file.

---

## Design Direction

Core Memories should feel like a personal journal, not a tech product. Warm, quiet, and analog — closer to a leather notebook than a dashboard. The palette is intentionally muted with a single warm accent to keep the focus on the content (your kid's words), not the interface. Serif text and paper textures reinforce the journal metaphor. The app is built for speed — one-tap recording for busy parents — but the visual language should never feel rushed or utilitarian. It should feel like the end of the day: settled, reflective, yours.

**Key tensions to get right:**
- **Fast to use, calm to look at.** The interaction model is optimized for speed. The visual design is not.
- **Simple, not empty.** Minimal UI, but every screen should feel considered and warm, never barren.
- **Emotional, not sentimental.** The content is inherently emotional. The app should hold that without amplifying it — no pastel illustrations, no cursive fonts, no "precious moments" energy.

---

## Colors

### Core Palette

| Token | Hex | Usage |
|---|---|---|
| bg | `#FAF8F5` | Page / screen background (cream) |
| card | `#FFFFFF` | Card surfaces |
| text | `#2C2420` | Primary text, dark brown |
| textSoft | `#8C7E74` | Secondary text, inactive icons, labels |
| textMuted | `#B5AAA0` | Placeholder, tertiary text, timestamps, ages |
| accent | `#E8724A` | Primary accent — mic button, CTA, hearts, links |
| accentSoft | `#FFF0EB` | Accent tint backgrounds (banners, play buttons, picker highlights) |
| accentPressed | `#D4613B` | Pressed/active state for accent buttons |
| accentGlow | `rgba(232,114,74,0.12)` | Favorited card glow shadow |
| heartFilled | `#E8724A` | Favorited heart (same as accent) |
| heartEmpty | `#D9D2CB` | Unfavorited heart stroke |
| border | `#EDE8E3` | Card borders, section dividers, input underlines, skeleton shimmer base |
| tag | `#F3EDE8` | Tag pill background, neutral button background |
| success | `#4CAF7C` | Positive feedback (saved, done) |
| successSoft | `#E8F5EE` | Success tint background |
| warning | `#E8A94A` | Warning states |
| warningSoft | `#FFF5E6` | Warning tint background |
| danger | `#D94F4F` | Destructive action (delete) |
| overlay | `rgba(44,36,32,0.45)` | Modal/dialog backdrops |
| general | `#B5AAA0` | "All" tab color (matches textMuted) |
| cardPressed | `#F7F4F1` | Tappable card pressed state (slight darken from card white) |

### Per-Child Colors

Auto-assigned in order as children are added. These persist across the entire app for pills, tabs, dots, and card accents.

| Slot | Name | Hex | 12% Opacity (pills/tabs) |
|---|---|---|---|
| 1 | Blue | `#7BAFD4` | `#7BAFD420` |
| 2 | Amber | `#D4A07B` | `#D4A07B20` |
| 3 | Green | `#9BC49B` | `#9BC49B20` |
| 4 | Plum | `#B88BB4` | `#B88BB418` |
| 5 | Teal | `#6BB5A8` | `#6BB5A820` |
| 6 | Rose | `#D48B8B` | `#D48B8B20` |

Use child color at full opacity for text, dots, and active borders. Use at ~12% opacity (`+ "20"` hex suffix) for pill backgrounds and tab fills. Use at ~25% opacity for active filter tab backgrounds.

### Screen-Specific Colors

| Where | Color | Usage |
|---|---|---|
| Core Memories background | `#F9F2EB` | Warm gradient top, fades to `bg` — distinguishes from Home |
| Notification background | `#F5F0EB` | Subtle warm gradient behind notification card |
| Recording backdrop | `rgba(244,226,214,0.45)` | Radial gradient warmth for recording/onboarding |
| First-entry banner | `linear-gradient(135deg, accentSoft, rgba(255,240,235,0.5))` | Celebration banner after first recording |

### Color Rules

- Never use raw hex in component code. Always pull from the theme object.
- If a new semantic color is needed, add it to this table first, then implement.
- Opacity variants of existing colors don't need new tokens — use runtime opacity.

---

## Typography

### Font Families

| Font | Usage |
|---|---|
| **System sans** (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`) | Default everywhere — UI chrome, labels, buttons, tags, metadata, navigation |
| **Georgia serif** (`'Georgia', serif`) | App title, onboarding headings, transcript body text, prompt cards, Core Memories title and card previews, empty state messages, birthday picker values, child name input. Georgia = journal voice. System sans = app voice. |

### Type Scale

Five named sizes for implementation. Map wireframe values to the nearest.

| Name | Size | Weight | Line-height | Usage |
|---|---|---|---|---|
| title | 22px | 800 | 1.3 | App title ("Core Memories") |
| heading | 16px | 700 | 1.4 | Screen headers, dialog titles, section headers |
| body | 14px | 400 | 1.5 | Entry text, descriptions, form inputs, body copy |
| label | 12px | 500–700 | 1.4 | Timestamps, section headers, labels, legal text |
| caption | 11px | 500 | 1.3 | Tags, audio timestamps, tiny metadata, age lines, hints |

### Extended Sizes (Wireframe Reference)

The wireframe uses additional sizes for specific contexts. At implementation, map these to the named scale or use sparingly as documented.

| Size | Weight | Usage |
|---|---|---|
| 28px | 800 | App title on Sign In only (Georgia serif, letter-spacing -0.5) |
| 20px | 700 | Onboarding headings — Memory Saved, Paywall (Georgia serif) |
| 18px | 700 | Section headings — Add Child, Mic Permission, Notifications (Georgia serif) |
| 18px | 500 | Prompt card text (Georgia serif, 1.5 line-height) |
| 17px | 700 | Core Memories screen title (Georgia serif, 0.3 tracking) |
| 15px | 400–700 | Transcript body text (Georgia serif, 1.65 line-height), Core Memories card previews (Georgia, 1.6 line-height), onboarding tagline |
| 13px | 600–700 | Child pills, tab labels, button labels, banner text |
| 10px | 600–700 | Date/time on cards, audio duration, flow map labels |

### Weight Scale

| Weight | Meaning |
|---|---|
| 800 | App title only |
| 700 | Headings, child pill names, active tab labels, primary buttons |
| 600 | Emphasized labels, section headers, secondary buttons |
| 500 | Default body weight, form values, pill text |
| 450 | Entry card preview text (slightly bolder than regular body) |
| 400 | Regular body, placeholder text, descriptions |

### Line Heights

| Value | Usage |
|---|---|
| 1.65 | Transcript text area (Georgia serif — needs room to breathe) |
| 1.6 | Core Memories card previews, empty state text |
| 1.55 | Entry card previews on Home |
| 1.5 | General body text, descriptions, prompt cards |
| 1.4 | Compact body — notification text, headings with tight leading |
| 1.3 | Title, captions — tightest leading |

### Typography Rules

- Never invent sizes outside the named scale without documenting them in the extended table.
- Weight 500–600 is acceptable for labels; weight 700 is reserved for section headers and tiny-label uppercase treatments.
- Uppercase + letter-spacing 0.8px is only used for tiny section headers at 12px.

---

## Spacing System

Prefer **4px grid** values (4, 8, 12, 16, 20, 24, 32, 48). In-between values like 6, 10, 14, 18 are acceptable for fine-tuning where the grid feels too coarse — the wireframe uses these throughout for optical balance. Avoid truly arbitrary values.

### Scale

| Token | Value |
|---|---|
| xs | 4px |
| sm | 8px |
| md | 12px |
| lg | 16px |
| xl | 20px |
| 2xl | 24px |
| 3xl | 32px |
| 4xl | 48px |

### Common Assignments

| Context | Value | Token |
|---|---|---|
| Screen padding (horizontal) | 20px | xl |
| Card padding | 16px | lg |
| Section gap (between cards) | 12px | md |
| Inner element gap | 8px | sm |
| Tight spacing (pills, tags) | 4px | xs |
| Prompt card padding | 24px | 2xl |

### Spacing Rules

- Prefer scale values. When fine-tuning, stay close to the grid (e.g. 6 instead of 5, 10 instead of 9).
- Margin-bottom between cards: `10–12px` (wireframe uses 10, grid says 12 — either is acceptable).
- Padding inside cards: `14–16px` (wireframe uses 14px top / 16px sides on entry cards).

---

## Safe Area Insets

Modern phones have system UI that overlaps the screen edges — the status bar at the top and the home indicator at the bottom (iPhone X and later). Every screen must account for these.

### Setup

- The root `_layout.tsx` wraps the app in `<SafeAreaProvider>` — this makes inset values available everywhere.
- Individual screens call `const insets = useSafeAreaInsets()` to read the device-specific values.

### Top Inset (`insets.top`)

- **TopBar component** handles this automatically — it adds `paddingTop: insets.top + spacing(3)`.
- Screens using TopBar don't need to handle the top inset themselves.
- Screens with a custom top bar (e.g. Recording, Entry Detail, Paywall) must apply `paddingTop: insets.top + spacing(3)` manually.
- Centered onboarding screens use `paddingTop: insets.top` on the container.

### Bottom Inset (`insets.bottom`)

Every screen with content near the bottom edge must include `insets.bottom` in its bottom padding. The pattern is:

```tsx
// Inline style override — adds device inset to the design spacing
<View style={[styles.bottom, { paddingBottom: insets.bottom + spacing(12) }]}>
```

| Screen type | Pattern |
|---|---|
| Absolute-positioned bottom bar (Home mic button) | `paddingBottom: insets.bottom + spacing(8)` on the bottom area |
| ScrollView / FlatList | `contentContainerStyle` with `paddingBottom: insets.bottom + spacing(N)` |
| Fixed bottom button area (onboarding) | `paddingBottom: insets.bottom + spacing(12)` on the bottom wrapper |
| Floating elements (Search result count) | `bottom: insets.bottom + spacing(6)` |

### Rules

- **Every new screen** must call `useSafeAreaInsets()` and apply both `insets.top` (unless TopBar handles it) and `insets.bottom`.
- On devices without a home indicator, `insets.bottom` is 0 — the design spacing remains unchanged.
- Never hardcode inset values (e.g., `paddingBottom: 34`). Always use `insets.bottom` so it adapts to every device.
- Centered content screens (e.g., Empty State, First Recording) where nothing touches the bottom edge don't need `insets.bottom`.

---

## Border Radius

Five tiers. Every border-radius in the codebase must use one of these values.

| Tier | Value | Usage |
|---|---|---|
| sm | 8px | Tags, small badges, progress bars, flow map elements |
| md | 12px | Child pills, inputs, notification action buttons, birthday picker confirm, banners |
| card | 14px | Entry cards, form cards, transcript area, primary buttons, settings cards, pickers |
| lg | 16px | Large cards (Core Memories, first-entry glow), modals, confirm dialogs |
| full | 9999px | Filter chips, child tabs (20px rendered), circular elements |

### Radius Rules

- Every `border-radius` in the codebase must use one of these five values.
- If a design shows a value between tiers, round to the nearest tier.
- The phone frame uses radius 40 — this is the only exception (device bezel, not UI).

---

## Shadows & Elevation

Three levels plus an accent glow. All shadows use warm brown `rgba(44,36,32,...)` as the base color — never pure black.

### Shadow Levels

| Level | Value | Usage |
|---|---|---|
| sm | `0 1px 3px rgba(44,36,32,0.06)` | Standard entry cards, default surfaces |
| md | `0 4px 12px rgba(44,36,32,0.10)` | Raised elements, dropdowns, notification card |
| lg | `0 12px 40px rgba(44,36,32,0.20)` | Modals, confirm dialogs |
| accent glow | `0 4px 20px rgba(232,114,74,0.35)` | Primary CTA (mic button on Home) |

### Extended Shadows (Wireframe Reference)

| Shadow | Usage |
|---|---|
| `0 1px 3px rgba(44,36,32,0.04)` | Inactive tabs |
| `0 2px 8px childColor18` | Active child tabs (tinted to child color) |
| `0 2px 12px rgba(44,36,32,0.06)` | Prompt cards |
| `0 2px 12px rgba(232,114,74,0.2)` | Accent-tinted elements |
| `0 4px 24px rgba(44,36,32,0.12)` | Notification card |
| `0 8px 32px rgba(44,36,32,0.12)` | Phone frame (wireframe only) |
| `0 0 20px/40px rgba(232,114,74,...)` | Pulsing mic button glow (animated) |
| `0 0 0 1.5px accent30, 0 2px 8px accentGlow` | Favorited entry card glow |
| `0 0 0 1.5px accent25, 0 3px 12px accent10` | Core Memories card glow |
| `0 0 20px accent18, 0 2px 12px rgba(44,36,32,0.06)` | First-entry celebration card |

### Shadow Rules

- Never use black (`rgba(0,0,0,...)`) for shadows. Always use the warm brown base.
- Cards always get `sm` shadow. Modals always get `lg`.
- The accent glow is only for the primary floating action button.

---

## Interactive States

Every tappable element must meet accessibility standards and provide visible feedback.

### Touch Targets

- **Minimum hit area**: 44×44px (Apple HIG)
- If the visual element is smaller (e.g., a 24px icon button), expand the tappable area with padding or an invisible hit-area wrapper.

| Element | Visual Size | Notes |
|---|---|---|
| Mic button (recording) | 96×96px | Largest element in the app. Pulsing glow. |
| Mic button (home) | 68×68px | Prominent but secondary to recording screen |
| Back/X/gear icons | ~20–22px | Pad tappable area to 44px minimum |
| Child picker + button | 24×24px | Pad tappable area to 44px minimum |
| Play button (Detail) | 36×36px | AccentSoft background circle |
| Play button (Core Memories card) | 26×26px | AccentSoft background circle |

### Pressed States

| Element type | Pressed feedback |
|---|---|
| Accent button | Background → `accentPressed` (#D4613B) |
| Ghost button | Background → `accentSoft` (#FFF0EB) |
| Card (tappable) | Background → `cardPressed` (#F7F4F1) |
| Icon button | Opacity 0.6 |
| Filter tab | Opacity 0.7 |

### Focus Rings

- Visible focus ring for keyboard/assistive navigation: `2px solid accent` with `2px offset`
- Only visible on `:focus-visible`, not on tap/click

---

## Transitions & Animation

Keep everything fast and purposeful. Motion should feel responsive, never sluggish.

### Duration Table

| Element | Duration | Easing |
|---|---|---|
| Button press | 100ms | ease-out |
| Background/color change | 150ms | ease-in-out |
| Card hover/press | 150ms | ease-in-out |
| Modal enter | 200ms | ease-out |
| Modal exit | 150ms | ease-in |
| Screen transition | 250ms | ease-in-out |
| Skeleton shimmer | 1500ms | linear (loop) |

### Transition Rules

- **Maximum duration**: 300ms for any user-initiated transition. Nothing should feel slow.
- Skeleton/loading shimmer is the only exception (loops at 1500ms).
- Always respect `prefers-reduced-motion: reduce` — disable all non-essential animation, keep only opacity fades at 0ms.

### Named Animations

| Name | Keyframes | Usage |
|---|---|---|
| `pulseGlow` | Shadow 20px↔40px at accent opacity | Mic button pulse — recording screens, onboarding |
| `fadeInUp` | opacity 0→1, translateY 16px→0 | Entry cards staggered entrance, inline pickers, prompt cards |
| `slideUp` | opacity 0→1, translateY 40px→0 | Larger entrance movements |
| `scaleIn` | opacity 0→1, scale 0.8→1 | Heart icon on Memory Saved screen |
| `breathe` | scale 1→1.15→1 | Breathing circle during active recording |
| `ringPulse` | scale 1→1.7, opacity 0.12→0 | Expanding ring behind breathing circle |
| `bannerIn` | translateY -100%→0, opacity 0→1 | "Memory saved" confirmation banner |
| `panelIn` | translateX 100%→0, opacity 0→1 | Flow map detail panel |

**Entry card stagger:** Cards animate in with `fadeInUp` at 60ms intervals (`delay={i * 60}`).

**Banner auto-dismiss:** The "Memory saved" banner on Entry Detail goes through phases: `in` (bannerIn) → `fading` (opacity 0.4s) → `collapsing` (max-height/margin/padding 0.3s) → `none`.

---

## Empty, Loading & Error States

Every screen must handle all three states. Never show a blank screen.

### Empty States

- Centered layout with a relevant icon (muted color, 48px)
- Warm, encouraging headline (heading size, 700 weight)
- Supportive body text (body size, textSoft)
- Primary action button when applicable ("Record your first memory")
- Tone: warm, never clinical. "No memories yet" not "No data found"

### Loading States

- Use skeleton screens that mirror the final layout shape
- Skeleton color: `border` (#EDE8E3) with shimmer animation (1500ms linear loop)
- Never use spinners as the sole loading indicator
- Skeleton cards should match card dimensions (radius, padding, height)

### Error States

- Friendly icon + warm message ("Something went wrong" not "Error 500")
- Body text explaining what happened in plain language
- "Try again" button as primary action
- Optional secondary action ("Go back")
- Use `danger` color sparingly — only for the icon or a subtle accent, not the entire message

---

## Component Patterns

### Entry Cards (Home)

Standard entry cards on the Home screen and Search results.

- Background: `card` with `paperTex` overlay
- Border: `1px solid border`
- Border radius: `card` (14px)
- Shadow: `sm`
- Content: child dot + name (colored), date, time, then 2-line transcript preview (system sans, 14.5px, 450 weight, `-webkit-line-clamp: 2`)
- **Favorited variant:** Border becomes `1px solid accent25`, shadow adds accent glow, filled heart icon shown

### Entry Cards (Core Memories)

Elevated treatment for the favorites screen. Should feel warmer and more expansive.

- Border radius: `lg` (16px)
- Shadow: `0 0 0 1.5px accent25, 0 3px 12px accent10` (warmer, more prominent)
- Border: `1px solid accent20`
- Transcript preview: **Georgia serif**, 15px, 400 weight, 1.6 line-height, **3 lines** (vs. Home's 2)
- Includes inline audio play button at bottom of card (26px circle, accentSoft background)
- Play button uses `stopPropagation` — tapping audio stays on Core Memories; tapping card navigates to Detail

### Child Pills

Used in metadata rows on Entry Detail and on entry cards.

- Dot (8px circle, full child color) + name (13px, 700 weight, full child color)
- Background: child color at 12% opacity
- Border radius: `md` (12px)
- On Detail: includes × for removal (11px, 60% opacity)
- On entry cards (inline, not pill): 11px, 600 weight — smaller for compact card layout

### Child Tabs

Horizontal scrollable row on Home and Core Memories screens.

- Padding: 7px 14px
- Border radius: `full`
- **Active:** `2px solid childColor`, background `childColor20`, text `childColor`, shadow `0 2px 8px childColor18`
- **Inactive:** `2px solid transparent`, background `card`, text `textMuted`, shadow `sm` at 0.04 opacity
- "All" tab uses `general` color (#B5AAA0)

### Tags

Uniform treatment for all tag types — no color-coding by tag type.

- Background: `tag` (#F3EDE8)
- Text: `textSoft`, caption size, 500 weight
- Border radius: `sm` (8px)
- Padding: 2px 8px
- × icon for removal (textMuted color)

### Primary Button (CTA)

Full-width action buttons used in onboarding and modals.

- Background: `accent` (or `border` when disabled)
- Text: white (or `textMuted` when disabled)
- Font: 15px, 700 weight, system sans
- Padding: 15px 0
- Border radius: `card` (14px)
- Pressed: `accentPressed`
- Cursor changes to default when disabled

### Confirmation Dialog

Overlay dialog for destructive actions (delete) and confirmations.

- Backdrop: `overlay`
- Card: `card` background, border radius `lg`, shadow `lg`
- Title: heading size, 700 weight
- Body: body size, textSoft, 1.5 line-height
- Two buttons side by side: Cancel (tag background, textSoft) and action (accent or danger background, white text)

### Inline Pickers (Child Picker, Tag Editor)

Panels that expand inline below their trigger element.

- Background: `card`
- Border: `1px solid border`
- Border radius: `lg` (16px)
- Padding: 12px 16px
- Entry animation: `fadeInUp` (200ms)
- Child picker: toggle pills (selected = colored border + tinted background + checkmark; unselected = border, card bg, textMuted). Stays open for multi-select; dismiss by tapping outside. Zero-child protection prevents closing with no selection.
- Tag editor: text input + "Your Frequent Tags" section with tappable pills

### Birthday Picker (Inline Scroll Wheels)

Expands inline within the Add Child card when the birthday row is tapped.

- Three columns: Month (35% width), Day (25%), Year (30%)
- Column height: 120px with overflow hidden
- Each row: 40px height, centered text
- Selected row: Georgia serif, heading size, 700 weight, text color; highlighted by `accentSoft` band behind it (40px tall, radius `sm`)
- Unselected rows: body size, 400 weight, textMuted
- Fade edges: linear gradient from card → transparent at top and bottom (36px fade)
- Confirm button: full-width "Set birthday" (accent background, white text, radius `sm`)
- Entry animation: `fadeInUp` (200ms)

---

## Paper Texture

Cards and transcript areas use a subtle SVG noise texture overlay for a journal feel. The texture is a fractal noise pattern at 2.5% opacity — visible on close inspection but never distracting.

```
feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="4"
rect opacity="0.025"
```

Applied to: entry cards, transcript text area, prompt cards, form cards (Add Child), text entry areas.
Not applied to: tabs, pills, buttons, settings rows, UI chrome.

---

## Gradients

| Gradient | Where |
|---|---|
| `radial-gradient(ellipse at 50% 40%, rgba(244,226,214,0.45) 0%, transparent 70%)` | Recording and Empty State backdrop — warm center glow |
| `linear-gradient(180deg, #F9F2EB 0%, bg 35%)` | Core Memories screen — warmer top fading to standard cream |
| `linear-gradient(180deg, bg 0%, #F5F0EB 100%)` | Notification screen — subtle warm base |
| `linear-gradient(to bottom, bg@0 0%, bg@55% 55%, bg 100%)` | Home screen bottom fade — content dissolves into mic button area |
| `linear-gradient(135deg, accentSoft 0%, rgba(255,240,235,0.5) 100%)` | First-entry celebration banner |
| `linear-gradient(card, transparent)` / `linear-gradient(transparent, card)` | Birthday picker scroll wheel fade edges |

---

## Tone & Language

The interface speaks in warm, encouraging language. Never clinical, never instructive, never guilt-inducing.

| Context | ✅ Do | ❌ Don't |
|---|---|---|
| Empty states | "No memories yet" | "No data found" |
| Core Memories empty | "Tap the heart on any entry to save it as a Core Memory" | "You haven't favorited any entries" |
| Search empty | "No memories found. Try different keywords or filters." | "0 results" |
| Delete confirmation | "Delete this memory?" | "Are you sure you want to delete?" |
| Recovery | "Entries are kept for 30 days" | "Items in trash will be permanently deleted" |
| Notification | "What made Emma smile today?" | "You haven't recorded today" |
| Notification age line | "She's 2 years, 4 months old — these days go fast." | (no age reference) |
| Memory saved | "Your voice and your words — kept forever." | "Entry saved successfully" |
| Onboarding | "A gentle nudge at bedtime" | "Enable push notifications" |
| Mic permission | "Nothing is ever recorded without you pressing the button" | "Microphone access required" |
| First entry | "This is where all your memories will live" | "Welcome to your dashboard" |

**General principles:**
- Use the child's name whenever possible — "Emma's first memory" not "your first entry."
- Frame features as emotional outcomes — "kept forever" not "stored in cloud."
- No streak counters, no "you missed X days," no guilt for inactivity.
- Encourage, don't instruct. "Or write instead" not "Switch to text input mode."
- The notification is a "gentle nudge" not a "reminder" or "alert."

---

## Visual Hierarchy by Screen

Each screen has a distinct emotional weight, created through background treatment and typography choices.

| Screen | Background | Title Font | Card Style | Emotional Role |
|---|---|---|---|---|
| Home | Flat `bg` cream | Georgia serif (app title only) | Standard cards (system sans preview) | Inbox — scan, capture, move on |
| Recording | Radial warm gradient | — | Prompt cards (Georgia serif) | Focus — calm, encouraging |
| Entry Detail | Flat `bg` cream | — | Transcript area (Georgia serif, paper texture) | Workshop — edit, refine, enrich |
| Search | Flat `bg` cream | System sans | Standard cards with highlights | Utility — find, filter |
| Core Memories | Warm gradient top (#F9F2EB→cream) | Georgia serif | Larger cards (serif preview, inline audio, amber glow) | Treasure box — slow down, savor |
| Settings | Flat `bg` cream | System sans | Grouped list rows | Configuration — functional |
| Notification | Warm gradient | System sans | Frosted glass card | Nudge — personal, inviting |
| Onboarding | Flat `bg` cream (except recording step) | Georgia serif | Paper-textured form cards | Welcome — emotional, progressive |