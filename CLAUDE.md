# Forever Fireflies — Project Instructions

**Session prefix: CM**

## Roadmap

Current priorities live in `docs/product/feature-roadmap.md` — specifically the **Current Status** section at the top and **Phase 10A / 10B** for launch-gating work. Check at the start of sessions to understand what's active, what's blocked, and what ships next.

## Landing Site (`landing/`)

The `landing/` folder contains the static website deployed to Cloudflare Pages at `foreverfireflies.app`. These are standalone HTML files — not part of the React Native app.

| File | URL | Purpose |
|------|-----|---------|
| `index.html` | `/` | Coming-soon landing page |
| `privacy.html` | `/privacy` | Privacy policy |
| `delete-account.html` | `/delete-account` | Account deletion page (required by app stores) |
| `auth/callback.html` | `/auth/callback` | Auth redirect bridge — Supabase redirects here after verifying email tokens, then the page redirects to the app via `forever-fireflies://` deep link. Needed because email clients block custom URL schemes but allow `https://` links. |

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

## Brand Voice

**Before writing any user-facing copy**, read `/BRAND_VOICE.md`. It governs tone, word choice, and channel-specific rules for all text that users see — in-app strings, push notifications, onboarding flows, app store copy, and marketing content.

- **When to apply:** Any task involving user-facing text — UI strings, notifications, empty states, error messages, onboarding, app store descriptions, email templates
- **When to skip:** Pure refactoring, infrastructure, backend logic, database migrations, or code-only changes with no user-facing text
- **For in-app copy specifically:** The Tone & Language table in `docs/design/design-style.md` remains the primary reference. `BRAND_VOICE.md` extends those rules to external channels (email, social, marketing)

## Git Safety

- **Never use `git stash` to temporarily shelve changes.** An auto-stash (labeled "Teleport auto-stash") once silently hid all working changes right before an `eas build`, causing a broken build to ship to Google Play with none of the latest code. The local dev server (`npx expo start`) still showed the correct files, so the problem was invisible until testers got the wrong version.
- **Before every `eas build`**, run `git stash list` and `git status` as a sanity check. If `stash list` is not empty or `status` looks suspiciously clean, something pulled changes away.
- **Do not auto-stash, rebase with auto-stash, or use any operation that implicitly stashes.** If you need to switch context, commit the work-in-progress instead.

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
- **Read `EXPO_PUBLIC_` env vars directly in the file that uses them — not through a shared config module.** Metro's babel transform replaces `process.env.EXPO_PUBLIC_*` at bundle time, but during OTA builds (`eas update`) the replacement silently fails inside `config.ts` while working fine when read directly. This caused PostHog analytics to be dead for a week with no errors. Sentry (which reads its DSN directly) kept working. Rule: for SDK init keys, do `const KEY = process.env.EXPO_PUBLIC_FOO` at the top of the file that needs it.
- **Deprecated APIs can silently do nothing — read the dev-server warnings.** When upgrading Expo / React Native, an old API isn't always *removed* — sometimes it's quietly demoted to a no-op. Calling it doesn't crash; the feature just stops working with no error. Real example: under Expo SDK 54's New Architecture, `LayoutAnimation.configureNext(...)` and `UIManager.setLayoutAnimationEnabledExperimental(true)` are no-ops, so any screen relying on them lost its smooth expand/collapse with zero visible failure. **Habit:** after every SDK bump, skim the `expo start` output for "no-op", "deprecated", or "will be removed" warnings, grep the codebase for each named API, and migrate or delete the call sites. Bugs that don't throw are the easiest to ship. The migration path off `LayoutAnimation` is `react-native-reanimated`'s `LinearTransition` / `entering` / `exiting` props.

## Push Notification Workflow

The notification system has several moving parts. Here's how they connect:

### How It Works (End to End)

1. **User picks a time** in Settings (e.g. 8:30 PM). The app stores this as `notification_time` (local) on their profile.
2. **App converts to UTC** on every launch: `notification_time` + device timezone → `notification_time_utc` (e.g. 8:30 PM Central = 01:30 UTC). This handles daylight saving changes automatically.
3. **pg_cron runs every minute** and calls the `send-notifications` Edge Function via `net.http_post()`.
4. **Edge Function** queries profiles whose `notification_time_utc` falls within ±2 minutes of the current UTC time, picks a personalized prompt with their child's name, and sends it via the **Expo Push API**.
5. **Expo Push API** routes the notification to the device via **FCM** (Android) or **APNs** (iOS).

### Key Components

| Component | Location | Role |
|-----------|----------|------|
| Settings UI | `app/(main)/settings.tsx` | User picks notification time (5-minute increments) |
| Timezone sync | `hooks/useNotifications.ts` | Converts local time → UTC on every app open |
| Profiles service | `services/profiles.service.ts` | Writes `notification_time_utc` and `timezone` to DB |
| Edge Function | `supabase/functions/send-notifications/index.ts` | Finds eligible users, picks prompts, calls Expo Push API |
| pg_cron job | Migration `20260301000037_fix_cron_vault.sql` | Triggers the Edge Function every minute |
| Vault secrets | `vault.secrets` table (manual, not in git) | Stores `supabase_url` and `service_role_key` for pg_cron |
| Device tokens | `user_devices` table | Expo push tokens registered on app launch |
| Notification log | `notification_log` table | Tracks every send for backoff + tap tracking |

### pg_cron + Supabase Vault

pg_cron runs as a separate background worker in PostgreSQL — it does NOT have access to `current_setting('app.settings.supabase_url')` or other GUC config values. To give pg_cron the URL and service role key it needs for `net.http_post()`, we store them in **Supabase Vault** (`vault.secrets`). The cron job reads from `vault.decrypted_secrets` at runtime.

- **Vault secrets are inserted manually** via the SQL Editor (never committed to git)
- **The cron schedule migration** only contains the `cron.schedule()` call with vault lookups
- The Edge Function has `verify_jwt = false` so pg_cron can call it without a user JWT, AND it manually verifies `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` so the URL can't be abused (security audit 2-B / 2-C)

**⚠️ Service-role key rotation runbook.** Rotating the service role key in Supabase Dashboard → Settings → API auto-updates the `SUPABASE_SERVICE_ROLE_KEY` env var inside edge functions, but does **NOT** auto-update the vault entry. Mismatched values mean pg_cron sends the old key, the function compares against the new key, and **both crons silently return 401** — no notifications, no purges, zero user-visible errors. After any rotation: immediately re-run the vault upsert SQL from migration `20260428000002` with the new value, then `curl` `/functions/v1/send-notifications` with the new key and confirm a 200 (or wait one minute and check the next cron tick succeeded in the function logs).

### Safeguards

- **Backoff**: If a user ignores 5 consecutive notifications (none tapped), stop sending until they tap one
- **Day-of-week filter**: Users can choose which days to receive notifications (`notification_days` array)
- **Time window**: Only matches ±2 minutes around the user's set time — prevents spam even though cron runs every minute

### Testing Tips

- Call the function manually: `curl -X POST https://xutoxnpttbwdiycbzwbp.supabase.co/functions/v1/send-notifications`
- The response JSON includes a `debug` object showing which gates passed/failed
- Check detailed logs in Supabase Dashboard → Edge Functions → send-notifications → Logs
- If notifications aren't arriving, check: (1) push token exists in `user_devices`, (2) `notification_time_utc` matches current UTC, (3) Expo Push API response in logs

## Topic-Specific Rules

Detailed rules auto-load from `.claude/rules/` when working on matching file paths:
- **Supabase & backend**: `supabase.md` — RLS patterns, service layer, schema, storage
- **Builds & native packages**: `docs/development/build-guide.md` — build profiles, when to rebuild, package rules
