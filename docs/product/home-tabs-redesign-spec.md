# Home & Bottom Tabs Redesign — PRD / Design Spec

**Status:** Spec complete, not yet implemented
**Date:** 2026-04-05
**Mockup reference:** `/forever-fireflies-home-mockup.html` (v13.4)

---

## Overview

Replace the current single-screen stack navigation with a **5-tab bottom tab navigator**. The current home screen (entry timeline + search/filters) becomes the **Journal** tab. A brand new **Home** tab becomes the app's dashboard with 6 curated sections. A **Calendar** tab and **Favorites** tab (existing Firefly Jar) are added. A raised center **Record** button opens the recording flow as a modal.

### Why

The current app puts everything on one screen — timeline, search, filters, recording — which gets cluttered as users accumulate entries. Splitting into purpose-built tabs gives each feature room to breathe: Home for at-a-glance delight, Journal for browsing/searching, Calendar for date-based navigation, and Favorites for treasured moments.

---

## Navigation Architecture

### Current → New

| Current | New |
|---------|-----|
| Stack navigator, all screens slide from right | Tab navigator with 5 tabs, each containing a nested stack |
| `home.tsx` = entry timeline + search + filters + mic | `journal.tsx` = renamed from home.tsx (entry timeline + search + filters) |
| `firefly-jar.tsx` = push from home | `firefly-jar.tsx` = Favorites tab (same screen, new location) |
| No calendar screen | `calendar.tsx` = new Calendar tab |
| No dashboard | `home.tsx` = new Home tab (dashboard with 6 sections) |
| Recording = push `recording.tsx` from home | Recording = full-screen modal overlay from any tab |

### Tab Bar Layout

```
[ Home ]  [ Journal ]  [ 🎙 Record ]  [ Calendar ]  [ Favorites ]
```

- **Record** is a raised circular orange button (`var(--accent)`) that floats above the tab bar with a shadow
- Active tab icon + label colored `var(--accent)` (orange)
- Inactive tab icon + label colored `var(--muted)`
- Tab bar background: `var(--card)` with top border `var(--border)`
- Tab bar height: 82px (includes safe area bottom)
- Record button: 56×56px circle, centered, raised 20px above tab bar
- Tab bar design details (notch vs float) to be finalized with designer — default to **float above with shadow**

### Nested Stacks

Each tab has its own stack navigator so `router.back()` returns to the correct tab:

| Tab | Stack screens |
|-----|---------------|
| Home | `home` → `entry-detail`, `prompts` (modal), `settings` → `faq`, `contact` |
| Journal | `journal` → `entry-detail` |
| Record | Modal overlay (not a real tab — no stack) |
| Calendar | `calendar` → `entry-detail` |
| Favorites | `firefly-jar` → `entry-detail` |

### Record Button Behavior

Tapping the raised mic button opens `recording.tsx` as a **full-screen modal** that slides up over the current tab. It is not a tab with its own screen — it's a modal presented from the tab navigator level. After saving, the modal dismisses and the user returns to whatever tab they were on. The entries store updates via Zustand, and all tabs reactively reflect the new entry.

### Settings Access

- Gear icon in the top-right of the **Home tab** top bar
- Pushes `settings.tsx` onto the Home tab's stack
- FAQ and Contact are sub-screens of Settings (unchanged)
- No hamburger menu — removed

### Search Access

- **No search icon on Home tab** — Home tab shows only the settings gear icon
- Search lives exclusively on the **Journal tab** (inline search bar + filter chips, same as current home.tsx)
- If we want to add a search icon to Home later, it would switch to the Journal tab with search focused

---

## Top Bar

### Shared Component

Use the existing `TopBar.tsx` component with conditional props per tab:

| Tab | Left content | Right content |
|-----|-------------|---------------|
| Home | Time-of-day greeting (serif, `var(--soft)`) | Settings gear icon |
| Journal | **"Journal"** (bold, sans) | Search icon (existing toggle) |
| Calendar | **"Calendar"** (bold, sans) | *(none, or month nav arrows)* |
| Favorites | **"Your Firefly Jar"** (bold, sans) | *(none)* |

### Greeting System

- **Home tab only** — other tabs show their page title in bold sans-serif
- Greeting text: Georgia serif, 16px, `var(--soft)` color
- **Random on each app open** — picks one message from the current time-of-day pool
- **No tap cycling** — the greeting stays fixed for the session (preserves delight over time; users discover new messages naturally across app opens)
- **Special greetings override time-of-day:**
  - Birthday: `"Happy Nth birthday, [Child]!"` — checks `children` table birthdays against today's date on mount
  - App anniversary: `"N year(s) of Forever Fireflies!"` — checks `profiles.created_at` against today's date
  - If multiple specials on the same day (e.g., child birthday + app anniversary), pick one randomly

#### Time-of-Day Pools

| Slot | Hours | Example messages |
|------|-------|-----------------|
| Morning | 5am–11:59am | "Morning quiet is the best quiet", "Hope your coffee is still warm", "Another day of tiny discoveries" |
| Afternoon | 12pm–4:59pm | "Right in the middle of it all", "The afternoon stretch", "Hope the day is being kind" |
| Evening | 5pm–8:59pm | "Almost made it to bedtime", "The quiet part of the day", "The house gets softer at night" |
| Late | 9pm–4:59am | "Burning the midnight oil?", "The whole house is asleep but you", "Can't sleep either, huh?" |

---

## Home Tab — 6 Sections

The Home tab is a `ScrollView` with 6 fixed-order sections. All data loads in parallel on mount with skeleton placeholders per section.

### 1. Branding Banner

**Purpose:** Warm, whimsical visual identity piece at the top of the Home tab.

**Layout:**
- Full-width card with 16px horizontal margin, 16px border radius
- Background: **Gradient** — `linear-gradient(160deg, #F5EDE3 0%, #EDE0D2 50%, #F0E6DC 100%)`
- Padding: 24px top/sides, 20px bottom
- Min height: 130px

**Scene:**
- **Static illustration** (PNG or SVG asset) of a hand-drawn sketch scene:
  - Jar on the right with wobbly pen-style lines, fireflies glowing inside
  - Escaped fireflies floating around the left/top area with dotted trails and tiny wing marks
  - Grass tufts at bottom, crescent moon, scattered stars
- **12 animated firefly dots** layered on top of the illustration using `react-native-reanimated`:
  - 6 jar-constrained (bounce within jar bounds)
  - 6 free-floating (drift across the full banner area)
  - Each dot: 2.5–4.5px circle, gold (`var(--glow)`) or accent orange, with glow shadow
  - Gentle wobble + pulse animation (continuous)

**Text overlay (positioned over the illustration):**
- Tagline: `"Your memories, kept forever"` — Georgia serif, 17px, `var(--text)`. The word "forever" in italic + accent color
- Subtitle: `"A journal for the moments that matter"` — 12px, `var(--soft)`

**Tap interaction:**
- On press, all 12 fireflies scatter (jar ones bounce fast inside jar bounds, free ones scatter across banner)
- After 2–3 seconds, they drift back to their normal floating pattern
- Uses Reanimated spring animations with randomized targets

**Illustration asset:** Needs to be created — a warm, hand-drawn sketch on transparent background that sits behind the text and firefly dots. Style reference: whimsical children's book illustration, pen/pencil linework.

### 2. Your Family

**Purpose:** Show the family's children with quick-access stats.

**Layout:**
- Section padding: 16px horizontal
- Section label: `"YOUR FAMILY"` — 10px uppercase, 600 weight, `var(--muted)`, 0.8px letter spacing
- Child avatars centered in a row with 24px gap

**Child Avatar:**
- 52×52px circle
- Photo (if set) or initial letter (Georgia serif, 20px, 700 weight)
- 3px ring border in child's assigned color (e.g., blue for Emma, amber for Liam)
- Shadow: `0 2px 8px rgba(44,36,32,0.08)`
- Hover/press: `translateY(-2px)`, enhanced shadow

**Below each avatar:**
- Name: 13px, 600 weight, `var(--text)`
- Age: 11px, `var(--muted)` (e.g., "2y 4m" or "10m")

**Memory count (below avatars):**
- Style: **Pill badge**
- Centered pill with: glow dot (5px gold circle with `box-shadow: 0 0 6px rgba(242,201,76,0.5)`) + text `"52 memories"` (12px, 600 weight, `var(--soft)`)
- Pill background: `var(--tag)` (#F3EDE8), border-radius: full (9999px), padding: 6px 14px
- Margin top: 10px

**Single-child families:** One centered avatar. Same layout, same pill badge. Still tappable.

**Tap interaction:**
- Tapping a child avatar opens a **Child Modal** (centered overlay)

#### Child Modal

- Overlay: `rgba(44,36,32,0.4)` backdrop, tap outside to close
- Card: `var(--card)` background, 20px border-radius, 300px width, `shadow-lg`
- Content (centered):
  - Avatar: 72×72px (larger version)
  - Name: Georgia serif, 20px, 700 weight
  - Age: 14px, `var(--soft)` (full format: "2 years, 4 months old")
  - Stats row (3 columns, centered):
    - **Memories** — count of entries for this child
    - **Favorites** — count of favorited entries for this child
    - **First memory** — title of oldest entry for this child (replaces "months recording")
  - Stat number: Georgia serif, 22px, 700 weight
  - Stat label: 10px uppercase, `var(--muted)`
  - Most recent entry: title + date in a subtle card (`var(--bg)` background, 10px border-radius)
  - `"See all memories ›"` link: 13px, `var(--accent)`, 600 weight
- **"See all memories" action:** Switches to the **Journal tab** with that child's filter pre-applied

### 3. On This Day (Polaroid)

**Purpose:** Surface nostalgic past entries from meaningful time intervals.

**Data:** Query entries for dates matching: 7 days ago, 30 days ago, 180 days ago, 365 days ago (±0 days, exact match). **Skip any time marker that has no entry.** If no markers have entries, hide the entire section.

**Layout:**
- Section padding: 12px horizontal, 16px top
- Section label: `"ON THIS DAY"` (same style as Family section label)
- **Horizontal swipe carousel** (FlatList/PagerView, horizontal, pagingEnabled)
- Navigation dots below the card (6px circles, active = `var(--accent)`, inactive = `var(--muted)` at 30% opacity)

**Each card — Polaroid style:**
- White background, 4px border-radius
- Padding: 10px sides, 10px top, 24px bottom (Polaroid "tab" at bottom)
- Shadow: `0 2px 12px rgba(44,36,32,0.12), 0 1px 3px rgba(44,36,32,0.08)`
- Slight rotation: `rotate(-1.5deg)`
- Content area: warm gradient background (`linear-gradient(135deg, #fdf8f0 0%, #f5ede3 100%)`), 2px border-radius, 14px padding
- Content:
  - **Time badge:** `"One week ago"` / `"One month ago"` / `"Six months ago"` / `"One year ago"` — Georgia serif, 16px, 700 weight
  - **Child indicator:** 6px color dot + child name (10px, `var(--soft)`)
  - **Preview text:** Georgia serif, 13px, italic, `var(--text)`, 1.45 line-height
  - **Footer:** Handwritten-style date — cursive font, 11px, `var(--muted)`, slight rotation
- **Tap to open:** Tapping the card navigates to `entry-detail` for that entry. Swiping cycles through time markers.

### 4. Today's Prompt

**Purpose:** Surface a daily recording prompt to encourage entry creation.

**Prompt selection:** Random unused prompt, filtered by children's age ranges (using existing `prompts` table + `prompt_history`). Cached for the day so it doesn't change on every app open (use date-keyed AsyncStorage or derive from date seed).

**Layout:**
- Card: `var(--card)` background, 16px border-radius, 16px padding, `shadow-sm`
- Title label: `"TODAY'S PROMPT"` — 10px uppercase, 600 weight, `var(--muted)`, 0.8px letter spacing

**Card body (row):**
- Left: Prompt text — Georgia serif, 18px, `var(--text)`, 1.35 line-height
- Right: Orange mic button — 44×44px circle, `var(--accent)` background, white mic icon, `shadow: 0 2px 8px rgba(232,114,74,0.3)`
- Mic button tap → opens Recording modal with this prompt pre-loaded

**Card footer (below a separator line):**
- Separator: 1px `var(--border)`, margin-top 12px, padding-top 10px
- Left: `"or write instead"` — 12px, `var(--muted)`, the link text in `var(--accent)`, 500 weight
  - Tap → pushes `entry-detail` in text-creation mode (no audio/transcript params) onto Home stack
- Right: `"explore more prompts ›"` — 12px, `var(--accent)`, 500 weight
  - Tap → opens `prompts.tsx` as a **modal** (slides up, back button dismisses back to Home)

**Subscription gating:** Lapsed users can SEE the prompt card but tapping the mic button or "write instead" triggers the `PostTrialPaywall` modal.

### 5. This Week (Streaks)

**Purpose:** Gentle visual showing recording activity for the current calendar week.

**Data:** Derive from entries store — check which days of the current Mon–Sun week have at least one entry. No new queries needed.

**Layout:**
- Card: `var(--card)` background, 12px border-radius, 14px vertical padding, 16px horizontal padding, `shadow-sm`
- 7 columns (Mon–Sun), evenly spaced (`justify-content: space-between`)
- Each column: day label + dot, centered, stacked vertically with 6px gap

**Day label:** 10px uppercase, 500 weight, `var(--muted)` — shows `M T W T F S S`

**Dot states:**
- **Unlit (no entry):** 12×12px circle, `var(--border)` background
- **Lit (has entry):** 12×12px circle, `var(--glow)` (#F2C94C) background, `box-shadow: 0 0 8px rgba(242,201,76,0.5), 0 0 16px rgba(242,201,76,0.2)`, gentle pulse animation (3s ease-in-out infinite)
- **Today (no entry yet):** 2px `var(--accent)` border, transparent fill
- **Today (has entry):** `var(--glow)` fill + `var(--glow)` border (no accent ring)

**Design note:** No streak count number. Just the peaceful dots. The visual speaks for itself.

**Weekly reset:** Sunday at midnight (local time), all dots reset for the new week.

### 6. Coming Up (Milestone)

**Purpose:** Countdown to the next child birthday.

**Data:** Compare today's date against each child's birthday in the `children` table. Calculate next occurrence. If nearest birthday is **>90 days away**, hide this entire section.

**Layout:**
- Card: `var(--card)` background, 12px border-radius, 12px padding, `shadow-sm`
- Row layout: countdown ring + text

**Countdown ring (left):**
- 44×44px SVG circle
- Track: `var(--border)` stroke
- Progress: `var(--accent)` stroke, calculated as `(90 - daysRemaining) / 90` (fills as birthday approaches)
- Rotated -90deg so progress starts at top
- Center label: days remaining (10px, 700 weight, `var(--accent)`)

**Text (right):**
- Name + milestone: Georgia serif, 13px, 600 weight, `var(--text)` — e.g., `"Liam turns 1"`
- Date: 11px, `var(--muted)` — e.g., `"April 28, 2026"`

**Multiple children:** If multiple birthdays are within 90 days, show the nearest one. Could show multiple cards stacked — decide during implementation.

---

## Journal Tab

### Summary

The Journal tab is the **renamed current home.tsx** with minimal changes. It IS the current entry timeline.

### What stays the same
- Search bar (collapsible, with filter chips for tags, locations, date ranges)
- Child filter tabs (horizontal scroll, "All" + per-child)
- Flat chronological entry list (FlatList of EntryCard components)
- Draft entries prepended above synced entries with sync badges
- Staggered animation entrance (60ms delay per card)
- Empty states (no data vs. no search results)
- Result count badge when filtering

### What changes
- **Top bar:** Shows "Journal" in bold sans-serif (not "Forever Fireflies" in serif)
- **Bottom area:** The large mic button and "or write instead" link are **removed** — recording is now accessed via the tab bar's center Record button. The gradient fade overlay is also removed.
- **Subscribe banner for lapsed users:** Moves to **Home tab** (not shown on Journal)
- **First-entry celebration banner:** Shows on **Journal tab** (since this is where entries appear)
- **File rename:** `home.tsx` → `journal.tsx`

### Navigation from Journal
- Tap EntryCard → pushes `entry-detail` onto Journal stack
- Back from entry-detail → returns to Journal (automatic via `router.back()`)

---

## Calendar Tab

### Summary

A month grid showing child-colored dots on days with entries. Tapping a day shows that day's entries in a bottom sheet.

### Data

**On mount:** Lightweight Supabase query — `SELECT id, entry_date, child_id FROM entries WHERE profile_id = ?` — returns only entry IDs, dates, and child IDs for ALL entries. Tiny payload (~50 bytes/entry). Cache in component state or a Zustand slice.

**On day tap:** If entries exist for that day, show them in a bottom sheet. Entry data (title, preview text) may already be in the entries store; if not, fetch on demand.

### Month Grid

**Header:**
- Month/year: Georgia serif, 18px, 700 weight, `var(--text)` — e.g., "April 2026"
- Left/right arrows: `‹` / `›` in `var(--soft)`, 18px, tappable (4px padding)

**Weekday labels:** 7 columns, `S M T W T F S`, 10px uppercase 600 weight `var(--muted)`

**Day cells:**
- 44px height (meets touch target minimum)
- 7-column grid, 2px gap, 16px horizontal padding
- Day number: 13px, 500 weight, `var(--text)` (or `var(--muted)` at 40% opacity for overflow days)
- **Today:** `var(--accent-soft)` background, 8px border-radius
- **Entry dots:** Below the day number, row of 5px circles with 3px gap, colored by child color
  - If one entry by Emma: one blue dot
  - If entries by Emma + Liam: blue dot + amber dot
  - Max 3 dots visible (clip if more)

**Navigation:** Users can swipe or tap arrows to go to any past month, back to their first entry's month. Cannot go forward past the current month.

### Legend

Below the grid: child name + color dot pairs. e.g., `● Emma  ● Liam`
- 11px, `var(--soft)`, 6px dot, 4px gap between dot and name, 16px gap between children

### Day Bottom Sheet

**Trigger:** Tap a day cell that has entry dots.

**Sheet:** Slides up from bottom, covers ~40% of screen height. Draggable to dismiss.

**Content — compact rows:**
- Each entry as a row: child color dot (6px) + entry title (14px, 600 weight) + time (12px, `var(--muted)`)
- Tap a row → pushes `entry-detail` onto Calendar stack
- Back from entry-detail → returns to Calendar (automatic)

**Empty days:** Tapping a day with no dots does nothing (no sheet).

---

## Favorites Tab (Firefly Jar)

### Summary

The existing `firefly-jar.tsx` screen, moved into the tab bar as the Favorites tab. **No redesign needed** — same screen, new location.

### What stays the same
- Warm gold gradient top
- Floating firefly particles
- Child filter tabs
- Memory count header
- EntryCard with `coreMemory` variant (gold border, inline audio)
- Empty state ("No fireflies yet")

### What changes
- **Top bar:** Shows "Your Firefly Jar" in bold sans-serif
- **Navigation:** No longer pushed from home — it's a persistent tab
- **First-favorite celebration banner:** When user favorites their first entry, show a celebration banner on this tab

---

## Banners & Contextual Messages

### Banner Placement

| Banner | Tab | Position |
|--------|-----|----------|
| Subscribe (lapsed users) | Home | Above or replacing branding banner |
| First entry celebration | Journal | Top of entry list |
| First favorite celebration | Favorites | Top of favorites list |
| Draft sync status | Journal | Existing DraftBanner position |

### Subscribe Banner (Lapsed Users)

- Shown on the **Home tab** only
- Positioned above the branding banner (pushes it down) or replaces it
- Triggers `PostTrialPaywall` modal on tap
- All Home sections remain visible — only recording/creation actions are gated

---

## Data & State Management

### Store Subscriptions

The Home tab subscribes to existing Zustand stores for reactive updates:

| Store | Home sections affected |
|-------|----------------------|
| `useEntriesStore` | Memory count (pill badge), On This Day, Streaks |
| `useChildrenStore` | Family avatars, birthday greeting, Coming Up milestone |
| Prompts (service call) | Today's Prompt |

When a new entry is created (from any flow), the entries store updates and Home re-derives all dependent sections automatically. No manual refresh needed.

### New Data Needs

| Data | Source | When fetched |
|------|--------|-------------|
| Greeting (time of day) | Device clock | On mount |
| Birthday check | `children` table (already in store) | On mount |
| App anniversary | `profiles.created_at` (already in auth store) | On mount |
| OTD entries | Entries store (filter by date) | On mount |
| Today's prompt | `prompts` table + `prompt_history` | On mount, cached for the day |
| Streak data | Entries store (filter current week) | Derived, reactive |
| Next birthday | Children store (compare dates) | Derived, reactive |
| Calendar dot data | New lightweight query (id, date, child_id) | Calendar tab mount |

### Loading Strategy

- All Home data fetches fire in **parallel** on mount
- Each section shows a **skeleton placeholder** while loading
- Sections appear independently as their data arrives
- Error states per section (not full-page error)

---

## Subscription Gating

| Element | Free/Lapsed users | Subscribed users |
|---------|-------------------|-----------------|
| Home tab (all sections) | ✅ Fully visible | ✅ Fully visible |
| Record button (tab bar) | Opens → PostTrialPaywall | Opens → Recording modal |
| Prompt mic button | Opens → PostTrialPaywall | Opens → Recording modal |
| "or write instead" | Opens → PostTrialPaywall | Opens → entry-detail (text mode) |
| Journal tab (browse) | ✅ Can browse entries | ✅ Can browse entries |
| Audio playback | ❌ Hidden | ✅ Available |
| Calendar tab | ✅ Can browse | ✅ Can browse |
| Favorites tab | ✅ Can view favorites | ✅ Can view favorites |
| Entry deletion | ✅ Always allowed | ✅ Always allowed |

---

## Empty / New User States

For brand new users (0 entries, just completed onboarding):

| Section | New user state |
|---------|---------------|
| Greeting | Normal time-of-day greeting (or birthday if applicable) |
| Banner | Shows normally with "0 memories and counting" in pill badge (or "Your memories, kept forever" without count) |
| Family | Shows the child added during onboarding, single centered avatar |
| On This Day | **Hidden** (no entries to look back on) |
| Prompt | Shows normally — this is the primary CTA for new users |
| Streaks | Shows with all 7 dots **unlit** — motivating, not discouraging |
| Coming Up | Shows if child's birthday is within 90 days, otherwise hidden |

The emptiness IS the motivation. The Prompt card is the hero for new users.

---

## Implementation Phases

### Phase 1: Tab Navigator + Journal + Record Modal + Favorites

**Goal:** Ship the structural navigation change. Every screen works, just in a new layout.

**Tasks:**
1. Replace stack navigator (`app/(main)/_layout.tsx`) with tab navigator
2. Create custom tab bar component with raised Record button
3. Rename `home.tsx` → `journal.tsx`, remove bottom mic/write area
4. Move `firefly-jar.tsx` into Favorites tab
5. Wire Record button to open `recording.tsx` as modal
6. Move Settings access to gear icon in top bar
7. Update TopBar to show tab-appropriate titles
8. Wire all existing navigation (entry-detail, settings, etc.) as nested stacks
9. Create placeholder `home.tsx` (new Home tab) and `calendar.tsx` with "Coming soon" content

**Shippable:** Yes — app works identically to before, just with tabs instead of stack.

### Phase 2: New Home Tab (6 Sections)

**Goal:** Build the full Home dashboard.

**Tasks:**
1. Greeting system (time-of-day pools, birthday/anniversary detection)
2. Branding banner (static illustration + 12 animated firefly dots + scatter interaction)
3. Family section (avatars, child modal with stats, "see all" → Journal pre-filtered)
4. Memory count pill badge
5. On This Day (data query, polaroid cards, horizontal swipe carousel)
6. Today's Prompt card (prompt selection, mic → record, write → text entry, explore → prompts modal)
7. Streaks section (Mon–Sun dots, glow animation, derived from entries store)
8. Coming Up milestone (birthday countdown ring, 90-day threshold)
9. Skeleton loading states for all sections
10. Empty/new user states
11. Subscription gating on creation actions
12. Banner system (subscribe banner, first-entry banner placement)

**Shippable:** Yes — full Home experience.

### Phase 3: Calendar Tab

**Goal:** Build the calendar view with day-tap bottom sheet.

**Tasks:**
1. Lightweight entry dates query (id, date, child_id — all entries)
2. Month grid renderer (7-column grid, day cells, child-colored dots)
3. Month navigation (arrows, swipe, back to first entry)
4. Today highlighting
5. Child color legend
6. Bottom sheet on day tap (compact entry rows)
7. Entry-detail navigation from bottom sheet
8. Loading and empty states

**Shippable:** Yes — complete calendar experience.

---

## Open Questions / Future Considerations

1. **Banner illustration asset** — Who creates the hand-drawn jar scene? Need a designer or illustration source.
2. **Tab bar notch vs float** — Defaulting to float with shadow. Revisit with designer.
3. **Multiple milestones** — If 2+ birthdays are within 90 days, show nearest only or stack cards? Decide during Phase 2.
4. **On This Day fuzzy matching** — Current spec uses exact date match. Could add ±1–3 day fuzzy matching later if OTD section is often empty.
5. **Prompt caching** — "Cached for the day" needs a mechanism (date-keyed AsyncStorage or deterministic seed from date). Decide during implementation.
6. **Calendar performance** — With 1000+ entries, the lightweight dates query should still be fast, but monitor and add pagination if needed.
7. **Animation budget** — Banner has 12 particles + scatter. Streaks has pulse. OTD has swipe. Test on low-end Android devices for performance.
8. **Deep links** — Push notifications currently open the app to the home screen. After this change, they should open to... Home tab? Journal tab? Entry-detail directly? Needs decision.
