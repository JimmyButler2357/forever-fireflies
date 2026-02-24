# Core Memories — Wireframe Style Guide

Keep wireframes visually consistent. Save detailed specs for implementation.

---

## Colors

### Core

| Token      | Hex         | Usage                        |
|------------|-------------|------------------------------|
| bg         | `#FAF8F5`   | Screen background            |
| card       | `#FFFFFF`   | Card surfaces                |
| text       | `#2C2420`   | Primary text                 |
| textSoft   | `#8C7E74`   | Secondary text, icons        |
| textMuted  | `#B5AAA0`   | Placeholder, tertiary text   |
| accent     | `#E8724A`   | Primary action, hearts, CTA  |
| accentSoft | `#FFF0EB`   | Accent tint background       |
| border     | `#EDE8E3`   | Card and section borders     |
| tag        | `#F3EDE8`   | Tag pill background          |
| danger     | `#D94F4F`   | Delete, destructive actions  |
| overlay    | `rgba(44,36,32,0.45)` | Modal backdrop      |

### Child colors (assigned in order as children are added)

| Slot | Color   | Hex         |
|------|---------|-------------|
| 1    | Blue    | `#7BAFD4`   |
| 2    | Amber   | `#D4A07B`   |
| 3    | Green   | `#9BC49B`   |
| 4    | Plum    | `#B88BB4`   |
| 5    | Teal    | `#6BB5A8`   |
| 6    | Rose    | `#D48B8B`   |

Use child color at full opacity for text/dots. Use at ~12% opacity for pill and tab backgrounds.

---

## Typography

- **System sans** (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`) everywhere by default
- **Georgia serif** for the app title and entry body text only
- Keep to a handful of sizes: ~11px for captions/tags, ~12px for labels, ~14px for body, ~16px for headings, ~22px for the app title. Exact scale locked at implementation.

---

## General Rules

1. **Warm shadows only.** Use `rgba(44,36,32,...)` — never black-based shadows.
2. **Tags are uniform.** All tags use the same neutral background. No color-coding by tag type.
3. **Core Memory glow.** Favorited entry cards get a subtle warm orange border/glow to distinguish them from regular cards.
4. **Paper texture.** Cards use a subtle noise texture overlay for a journal feel.
5. **Tone is warm, not clinical.** Empty states say "No memories yet," not "No data found." Encourage, don't instruct.