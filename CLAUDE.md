# Forever Fireflies — Project Instructions

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

## General Coding Patterns

- **Validate at the boundary, trust internally.** Service methods should check auth and validate inputs. Internal helpers can trust what the service passes them.
- **Never trust caller-supplied identity.** Always derive user/profile IDs from the authenticated session.
- **Errors must have context.** Use `throw new Error('Failed to [verb]: ...', { cause: error })` — never bare `throw error`.
- **Defense in depth.** RLS is the safety net, not the only check. Service layer should also validate access.
- **After writing migrations**, regenerate types: `npm run gen:types`

## Communication Style

- **Explain like I'm five (ELI5).** I'm a new coder learning as we go — explain each concept in simple terms with analogies where helpful.
- **Teach, don't just tell.** When describing what code does, explain *why* it works that way and what would go wrong without it. Use phrases like "Think of it like..." or "Imagine you have..." to make abstract concepts concrete.
- **Define jargon inline.** When using a technical term for the first time (e.g. "stale closure", "mapper", "join"), explain what it means in plain language right there — don't assume prior knowledge.
- **Show before and after.** When explaining a fix, show what the code looked like before (and why it was broken) alongside the corrected version.

## Lessons Learned (Code Review Recap)

Common mistakes to watch for — learned from the Phase 4-5 code review.

### Database Queries

- **Always include all joins that the mapper expects.** Every query that returns entries must include `entry_children(child_id)` AND `entry_tags(tag_id, tags(name, slug))`. The mapper (`mapSupabaseEntry`) crashes if a join is missing because it tries to `.map()` over `undefined`. When adding a new query method (like `getDeleted`), copy the full `.select(...)` string from an existing method — don't type it from memory.
- **Use `getSession()` not `getUser()` for identity checks.** `getUser()` makes a network request every time. `getSession()` reads from the local cache — same result, no network delay. Only use `getUser()` when you need to *verify* the session is still valid server-side.

### React Patterns

- **Watch for stale closures in effects.** When a `useEffect` runs code that reads state variables, it captures the values from the render when the effect was created — not the latest values. If the effect runs later (e.g. on a navigation event), it sees old/stale data. **Fix:** Store values in `useRef` and read from `ref.current` inside the effect.
- **Put success-only code inside the `try` block.** Code placed *after* a `try/catch` runs whether the try succeeded or failed. If you only want something to happen on success (like navigating away after sign-out), it must be *inside* the `try` block, before the `catch`.
- **Use `retryCount` in useEffect deps for retry buttons.** Instead of duplicating fetch logic in a retry handler, increment a `retryCount` state variable. Add it to the `useEffect` dependency array — the effect re-runs automatically. One source of truth, no duplicated code.
- **Declare refs after the hooks they depend on.** If a ref needs to track a value from a hook (e.g. `const locationTextRef = useRef(locationText)`), declare the ref *after* calling that hook. Otherwise TypeScript reports "used before declaration."

### General Patterns

- **Don't duplicate utility functions across files.** If two or more screens need the same helper (date formatting, building a child map, mapping entries to card props), extract it into a shared module under `lib/`. We have `lib/dateUtils.ts` and `lib/entryHelpers.ts` for this purpose.
- **Use union types instead of plain `string` for known values.** When a field can only be one of a few specific values (like `'voice' | 'text'`), type it as a union — not just `string`. This catches typos and wrong values at compile time.
- **Parallelize independent async calls with `Promise.all()`.** If two operations don't depend on each other (e.g. uploading audio and detecting child names), run them at the same time instead of one after the other. Saves time for the user.
- **Remove dead code.** Unused imports, unused state variables, and functions that nothing calls should be deleted — not left around "just in case." Dead code is confusing because future readers assume it's there for a reason.

## Topic-Specific Rules

Detailed rules auto-load from `.claude/rules/` when working on matching file paths:
- **Supabase & backend**: `supabase.md` — RLS patterns, service layer, schema, storage
- **Builds & native packages**: `docs/development/build-guide.md` — build profiles, when to rebuild, package rules
