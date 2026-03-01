# Core Memories — Design Ideas & Visual Refinements

Brainstormed ideas for pushing the app's visual warmth and journal feel further. Each is independent — can be tried one at a time without requiring the others.

Status key: `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` rejected

---

## Color & Background

### 1. Warmer Background Cream
`[ ]`

**Goal:** Make the base screen feel more like real parchment and less like a modern minimal website.

Shift `bg` from `#FAF8F5` (safe, almost gray-warm) toward something like `#F7F3EC` (true parchment, leans yellow-warm). It's a small hex change but it shifts the emotional temperature of every screen — from "clean and neutral" to "lived-in and personal."

### 2. Off-White Cards
`[ ]`

**Goal:** Remove the clinical contrast between pure white cards and the cream background, so the whole screen feels like the same paper.

Shift `card` from `#FFFFFF` to something like `#FDFAF6` (barely warm, still reads as "white"). Think "fresh page in an old notebook" — noticeably lighter than the background but not a jarring pure white that breaks the paper illusion.

### 3. Cascade Neutral Colors
`[ ]`

**Goal:** Keep the entire neutral palette cohesive after warming the background — nothing should look cold or out of place.

If the background and cards shift warmer, several supporting colors need to follow:
- `border`: `#EDE8E3` → `#EAE4DC`
- `tag`: `#F3EDE8` → `#F0E9E2`
- `heartEmpty`: `#D9D2CB` → `#D6CEC5`
- `cardPressed`: `#F7F4F1` → `#F5F0EA`
- `coreMemoriesBg`: `#F9F2EB` → `#F5EEE5`
- `notificationBg`: `#F5F0EB` → `#F3ECE4`

---

## Typography

### 4. Merriweather Font
`[ ]`

**Goal:** Replace the generic system serif (Georgia) with a font that feels intentionally chosen — more personality without sacrificing readability.

Merriweather was designed specifically for screen reading. It's slightly condensed with a warm feel — more structured and readable than Georgia while still feeling personal. It supports the app's balance of journal warmth with organizational clarity. (Chosen over Lora, which was more calligraphic/playful — Merriweather better fits the "warm tool, not pure journal" direction.)

Weights to load: 400 Regular, 400 Italic, 700 Bold, 900 Black. Package: `@expo-google-fonts/merriweather`.

### 5. Italic for Parent's Voice
`[ ]`

**Goal:** Make the parent's actual words visually distinct from UI text — like handwriting in a notebook vs. printed labels on the page.

Use italic serif for transcript text, entry card previews, and Core Memories card previews. These are the places where the parent's voice lives. The rest of the app (buttons, labels, headings) stays upright. The subtle slant makes the content feel personal without going full cursive or handwriting font.

---

## Texture & Surface

### 6. Paper Texture on Tag Pills
`[ ]`

**Goal:** Soften the last flat UI elements so they feel less like buttons on a website and more like labels in a notebook.

Apply the existing `PaperTexture` SVG noise component (already used on cards) inside tag pills. Same fractal noise, same 2.5% opacity, matched to the pill's `sm` border radius. No new assets needed — just reusing what's already built.

### 7. Softer Borders
`[ ]`

**Goal:** Reduce the mechanical, ruled-line feel of uniform `1px solid` dividers and lean toward more organic visual separations.

Options to explore:
- More generous whitespace between sections instead of border lines
- Dotted or dashed borders where lines remain (feels like perforated journal pages)
- Very subtle gradient fades instead of hard lines (content just drifts apart)

---

## Key Design Principle

### 8. Keep the Coral Accent Bright
`[x]` Decision made — keep `#E8724A` as-is.

**Goal:** Maintain visual energy and engagement. The warm, muted palette needs a contrasting "spark" to stay inviting rather than collapsing into one dull mood.

The coral `#E8724A` is intentionally punchy — it's the bright red bookmark ribbon on a leather journal. Earthier alternatives were explored (`#D4714A`, `#C8694A`, `#D06040`) but rejected: too dark and the app loses its light and fun. The tension between calm backgrounds and a lively accent is what makes the design work.
