# Pre-Launch Code Review — 2026-04-28

**Reviewer**: Claude (multi-agent codebase audit)
**Scope**: Frontend, backend services, edge functions, infrastructure, migrations.
**Status legend**: ☐ Open · ◐ In progress · ✅ Done

---

## How this was done

Three parallel audit agents (frontend / backend-Supabase / edge-functions+infra) each produced a candidate list of bugs. Every "CRITICAL" finding was then verified by reading the source code directly — two agent claims turned out to be false positives and are noted at the bottom of this doc.

Each finding has: 📍 location · 🐛 ELI5 of the bug · 💥 why it matters · 🛠️ fix · ☐ status.

---

## CRITICAL — fix before public launch

### ✅ 1. Push notifications can silently miss users — cron schedule conflict
**Fix landed**: new migration [supabase/migrations/20260428000002_restore_per_minute_notification_cron.sql](../../supabase/migrations/20260428000002_restore_per_minute_notification_cron.sql) restores `* * * * *` and renames the job to `send-prompt-notifications` (the old `send-nightly-notifications` name was misleading — also clears finding #11). Wraps `cron.unschedule` in a `DO $$ ... EXCEPTION` block for idempotency (clears finding #14). **Deploy**: `supabase db push`. Vault secrets must already be in place from migration 037.
📍 [supabase/migrations/20260301000035_schedule_notifications_cron.sql:25](../../supabase/migrations/20260301000035_schedule_notifications_cron.sql) **vs** [20260301000037_fix_cron_vault.sql:21](../../supabase/migrations/20260301000037_fix_cron_vault.sql) **vs** [supabase/functions/send-notifications/index.ts:64-95](../../supabase/functions/send-notifications/index.ts)

🐛 **ELI5**: Imagine the mailman is scheduled every 5 minutes. He glances at his watch the moment he arrives, writes the exact time on a sticky note, and only delivers to mailboxes whose label matches that sticky note **to the minute**. If his watch ever reads `12:01` instead of `12:00` (because traffic delayed him by a minute), nobody gets mail that hour.

That's what's happening:
- Migration 035 scheduled `* * * * *` (every minute).
- Migration 037 silently changed it to `*/5 * * * *` (every 5 minutes) — no comment explains why.
- The function still does an exact-string match (`eq('notification_time_utc', currentUtcTime)`) and its own comment says "the cron runs every minute."
- pg_cron has natural jitter; if it fires at `12:00:30` we read `12:00:00` (matches). If it fires at `12:01:30`, we read `12:01:00` and match nobody.

💥 Users may stop getting their daily nudge with no error visible.

🛠️ Restore the every-minute schedule (matches function assumptions, low cost — ~1440 cheap indexed lookups/day) **and** re-enable dedup (#3) as a safety belt.

---

### ✅ 2. `entry_media` table is missing an UPDATE RLS policy → photo edits silently fail
**Fix landed**: new migration [supabase/migrations/20260428000001_add_entry_media_update_policy.sql](../../supabase/migrations/20260428000001_add_entry_media_update_policy.sql) adds `entry_media_update_own` allowing only the row's original uploader to update (mirrors the DELETE policy). **Deploy**: `supabase db push`, then `npm run gen:types`.
📍 [supabase/migrations/20260411000002_create_entry_media.sql:33-46](../../supabase/migrations/20260411000002_create_entry_media.sql)

🐛 **ELI5**: An RLS policy is like a doorman that decides which rows you can read or change. The migration adds doormen for "Read", "Write new", and "Delete" — but **no doorman for "Edit"**. With RLS enabled, "no doorman" means "nobody allowed in" — every UPDATE on `entry_media` is silently blocked.

💥 Anything that reorders photos (`display_order`) or fills in `width/height/file_size_bytes` after upload errors out today.

🛠️ New migration adding `CREATE POLICY entry_media_update_own ON entry_media FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());` — then `npm run gen:types`.

---

### ✅ 3. Notification dedup AND backoff are both turned off with TODOs
**Fix landed**: [supabase/functions/send-notifications/index.ts](../../supabase/functions/send-notifications/index.ts) lines 126–179. One `notification_log` query per eligible profile (small set — typically 1–10 users per minute) covers both checks:
- **Dedup**: 22-hour rolling window — never two pushes within 22h. The 22h (vs 24h) gives a small cushion so users who shift their notification time slightly aren't falsely blocked.
- **Backoff**: skips users whose last 5 notifications were ALL untapped. Any single tap in the last 5 resumes sending.

Caveat documented in the code: `notification_log.sent_at` is still recorded BEFORE Expo confirms delivery, so failed sends still occupy the dedup window. That's review finding #5 and is deferred to a separate fix. **Deploy**: `supabase functions deploy send-notifications`.
📍 [supabase/functions/send-notifications/index.ts:126-130](../../supabase/functions/send-notifications/index.ts) (dedup) and [:140-142](../../supabase/functions/send-notifications/index.ts) (backoff)

🐛 **ELI5**: Two safety belts are unbuckled and the comments say "buckle me before launch":
- **Dedup** prevented sending the same notification twice in a short window.
- **Backoff** prevented spamming users who ignored 5 notifications in a row.

💥 In production a user who ignores nudges gets the same nudge tomorrow, and the next day, forever — fastest path to uninstall. Manual triggers + cron together can also produce duplicates.

🛠️ Re-enable both. Use `notification_log.tapped` for backoff (table already supports it — see [migration 027](../../supabase/migrations/20260301000027_fix_notification_log.sql)).

---

## HIGH — fix before broader rollout

### ✅ 4. `process-entry` has no timeout on the Anthropic API call
**Fix landed**: [supabase/functions/process-entry/index.ts](../../supabase/functions/process-entry/index.ts) lines 190–236. `AbortController` with 12s timeout wraps the `fetch`. On abort or any other fetch failure (DNS, TLS, etc.) returns `{ success: false, retriable: true, error: ... }` so the client can decide whether to retry, instead of stalling for the full 50-second platform kill. **Deploy**: `supabase functions deploy process-entry`.
📍 [supabase/functions/process-entry/index.ts:190-203](../../supabase/functions/process-entry/index.ts)

🐛 **ELI5**: When you order a pizza you don't sit by the phone forever — you set a timer. The Anthropic `fetch()` has no timer. If their API hangs, the function waits up to Supabase's 50-second platform kill. Concurrent users pile up while one user blocks a worker.

💥 During an Anthropic incident, the AI pipeline stalls and users see no retry guidance.

🛠️ Wrap the `fetch` in `AbortController` with ~12s timeout; on abort, return the same `success:false` shape so the client handles it gracefully.

---

### ✅ 5. `notification_log` row is created BEFORE Expo confirms the push
**Fix landed** in two parts:
- New migration [supabase/migrations/20260428000003_add_notification_delivery_status.sql](../../supabase/migrations/20260428000003_add_notification_delivery_status.sql) adds a `delivery_status` column with `CHECK ('pending' | 'sent' | 'failed')` and backfills existing rows to `'sent'`.
- [supabase/functions/send-notifications/index.ts](../../supabase/functions/send-notifications/index.ts) now: inserts the row at default `'pending'`, flips it to `'sent'` after a successful Expo response, or `'failed'` on a non-OK response. The dedup query (lines 156–163) filters `delivery_status = 'sent'`, so failed rows no longer poison tomorrow's send.

**Deploy order matters** (the function references the column, so DB must be ahead):
1. `supabase db push`  — apply the migration
2. `npm run gen:types` — refresh local types
3. `supabase functions deploy send-notifications`

Sub-bug worth flagging: if every Expo ticket inside a multi-device push errors, we still mark the row `'sent'`. Worth a follow-up to inspect per-ticket statuses, but most multi-device users have at least one good token.

---

### ✅ 6. `purge-deleted` can orphan audio files forever
**Fix landed**: [supabase/functions/purge-deleted/index.ts](../../supabase/functions/purge-deleted/index.ts) now treats Supabase's batch `.remove()` as all-or-nothing (which it is at the API level). On storage failure it logs and only deletes entries that had no `audio_storage_path` (text-only entries can never orphan a file). Entries with audio stay in the soft-deleted state and the next daily run retries the storage call. Response payload now includes `deferred` count + reason. **Deploy**: `supabase functions deploy purge-deleted`.

---

### ✅ 7. Service methods skip `auth.getSession()` before `.single()`
**Fix landed**: swept every `.single()` in `services/`. Categorized as:
- **Already protected** (no change needed): `profiles.service` (both methods), `families.service.getMyFamily`, `entries.service.create`, `storage.service.getEntryMediaUrl` (via `getUserFamilyIds()`).
- **INSERT...select pattern** (no auth-gap risk because RLS denials surface as explicit errors, not 0-row): `tags.service.createTag`, `entries.service.addEntryPhoto`'s second `.single()`.
- **Needed the guard** (4 fixed):
  - [services/entries.service.ts](../../services/entries.service.ts) — `getEntry`, `update`, `addEntryPhoto`
  - [services/children.service.ts](../../services/children.service.ts) — `updateChild`

Each gets the standard pre-check:
```ts
const { data: { session } } = await supabase.auth.getSession();
if (!session) throw new Error('Not authenticated — please sign in again');
```

Tests updated: added a `beforeEach` session mock in the `getEntry` and `updateChild` describes, plus a new `throws when not authenticated` test in each. All previously-passing tests still pass; no new failures introduced.

---

### ✅ 8. Day-of-week notification filter uses UTC, ignores user's timezone
**Fix landed**: added a `getDayOfWeekInTimezone(date, timezone)` helper at the top of [supabase/functions/send-notifications/index.ts](../../supabase/functions/send-notifications/index.ts) using `Intl.DateTimeFormat` (Deno-supported). The profiles SELECT now also pulls `timezone`, and the day-of-week filter computes each user's local weekday before checking against `notification_days`. Profiles with no timezone fall back to UTC (preserves old behavior). **Deploy**: `supabase functions deploy send-notifications`.

---

## MEDIUM — next maintenance pass

### ✅ 9. Push tokens partially logged
**Fix landed**: replaced the partial-token log with a count-only log. Tokens, even partial, never appear in logs anymore.

### ✅ 10. Cron-time logs are noisy
**Fix landed**: added a `VERBOSE_LOGS=1` env gate + `debug()` helper at the top of [send-notifications/index.ts](../../supabase/functions/send-notifications/index.ts). Wrapped the `[DEBUG]` and `[GATE]` logs (which fire on every cron tick). **Bonus removal**: the diagnostic-only `SELECT id, notification_enabled, notification_time_utc, timezone FROM profiles WHERE notification_enabled = true` query that ran every minute is gone — that was wasted DB I/O at scale. Per-user error/skipped/sent logs are kept unconditional because they're bounded by the (small) number of users notified per minute.

### ✅ 11. Cron job named `'send-nightly-notifications'` but runs every 5 min
Cleared as part of fix #1 — the new cron is named `send-prompt-notifications`.

### ✅ 12. `getEntryMediaUrl` does a per-call DB round-trip — N+1 risk
**Fix landed**:
- [services/storage.service.ts](../../services/storage.service.ts) `getEntryMediaUrl(storagePath, knownFamilyId?)` — when the caller passes `knownFamilyId`, the per-photo `entries` lookup is skipped.
- The other DB call inside (`getUserFamilyIds()`) is now memoized at module level, keyed on the current user's id with a 5-minute TTL. The cache key auto-invalidates when the signed-in user changes, so no manual reset on sign-out.
- Callers updated to pass `familyId` from `useAuthStore`:
  - [app/(main)/entry-detail.tsx:924,1228](../../app/(main)/entry-detail.tsx) (already had `familyId` from authStore)
  - [components/EntryCard.tsx](../../components/EntryCard.tsx) (added `useAuthStore` import; `familyId` pulled once per card render and passed to all photos)

**Net effect**: a 20-card timeline with 3 photos each used to make ~120 DB queries (60 user_family_ids + 60 entries lookups) just to validate ownership. Now: 1 user_family_ids RPC at first call (cached for 5 min), and zero entries lookups when callers pass familyId. The unavoidable storage `createSignedUrl` calls remain.

### ✅ 13. Hardcoded `#FFFFFF` instead of theme token
**Fix landed**: added a semantic `colors.textOnAccent` token to [constants/theme.ts](../../constants/theme.ts) (set to pure white `#FFFFFF`, distinct from `colors.card`'s warm off-white `#FEFCF9`). Swept all 5 occurrences across the codebase: `add-child.tsx:612`, `ErrorBoundary.tsx:107`, `NotificationPermissionModal.tsx:146`, `PhotoCropper.tsx:581`, `TimePicker.tsx:141`. `git grep "'#FFFFFF'"` in `app/` and `components/` is now empty.

### ✅ 14. Cron migration 037 is not idempotent
Cleared as part of fix #1 — the new migration uses the `DO $$ ... EXCEPTION` wrapper for both unschedule calls.

---

## LOW — polish

### ✅ 15. Missing `useEffect` dep in [recording.tsx:286-290](../../app/(main)/recording.tsx)
**Fix landed**: added `handleStop` to the deps array. Pure lint hygiene — runtime behavior is identical because the parent re-renders whenever `seconds` changes, so the captured `handleStop` reference was already fresh.

### ✅ 16. `uploadEntryPhoto` lacks defense-in-depth ownership check
**Fix landed**: [storage.service.ts](../../services/storage.service.ts) `uploadEntryPhoto` now does a `entries.select('user_id')` lookup before building the path or uploading. If the caller doesn't own the entry, throws `'Access denied — cannot upload to another user's entry'`. Storage RLS would catch the same case, but a service-layer error message is clearer for debugging.

### ✅ 17. Verify Expo Push fields `collapseId` + `tag` (Layer 1 verified — Expo API accepts them)
**Live test results (2026-05-03)**:

Triggering the deployed function (`curl -X POST` against `/functions/v1/send-notifications`) returned `{"success":true,"sent":0,"reason":"No profiles due at this time"}` — no profile was due in the current minute, so the function never reached the Expo call. Pivoted to the cleaner test: same payload sent directly to `https://exp.host/--/api/v2/push/send` with a fake-but-well-formatted token to isolate the field-validity question from token validity.

**Result**:
```json
{"data":{"status":"error","message":"... is not a registered push notification recipient ...","details":{"error":"DeviceNotRegistered",...}}}
```

That's `DeviceNotRegistered` — token-routing failure, NOT `VALIDATION_ERROR`. Expo's validator accepted the payload shape (including `collapseId` and `tag`) and only failed because the token was fake.

**Control test** — sent a payload with a clearly-invalid `priority: "not-a-real-priority"` value: Expo returned `{"errors":[{"code":"VALIDATION_ERROR", "message":"... 0.priority: Invalid enum value ..."}]}`. So Expo's validator IS running and DOES reject bad enum values. It just doesn't reject `collapseId` or `tag`.

**Implications**:
- The fields are **safe to keep** — no risk of `ValidationError` blocking pushes.
- Expo's validator accepts unknown fields silently (it only flagged `priority`, not the deliberately fake `totallyInvalidFieldName` I also sent in the control). So the fields might either pass through to FCM/APNs and actually collapse notifications, or be silently dropped — Layer 1 can't distinguish.

**Layer 2 (still optional, your call)** — to confirm collapse actually happens on the device tray:
1. Disable dedup temporarily, or sign in three test users.
2. Trigger three pushes ~10 seconds apart with screen locked.
3. Check the lock screen / notification tray.
   - One notification visible = collapse works.
   - Three stacked = the field is being silently dropped; safe to remove for tidiness.

**Mitigation**: even if the fields don't actually collapse, the dedup window (#3, 22 hours) caps each user at 1 push/day in practice — so the spam-prevention value of `collapseId` is mostly redundant with what we already shipped. Removing the two lines wouldn't change observable behavior for most users.

**Recommendation**: **leave them in for now.** They're harmless (Layer 1 verified). Revisit if you ever see notifications stacking unexpectedly on a real device.

---

## False positives (don't chase these)

- **"SQL injection in `prompts.service.ts:99`"** — `recentIds` are typed UUIDs read from the `prompt_history.prompt_id` column. PostgreSQL rejects malformed UUIDs at the column type level. No injection vector.
- **"Stale closure in `recording.tsx:286`"** — calling `handleStop()` inside an effect that doesn't list it as a dep is **not** a stale-closure bug here, because the parent re-renders whenever `seconds` changes. Worth fixing for ESLint hygiene (#15) but not a runtime bug.

---

## Cross-cutting patterns

- **`.single()` audit**: ✅ done as part of #7 — every protected `.single()` in `services/` now has its `getSession()` guard.
- **Edge-function timeouts**: every external `fetch` (Anthropic, Expo Push) deserves an `AbortController`. Pattern from #4 done; could still be reused for the Expo call.
- **Notification log integrity**: items #3, #5, #8 are all about "can we trust `notification_log` enough to drive product decisions later?" — all three landed.

## Side-effect cleanups landed during the review

These weren't in the original audit but came up while fixing other items:

- **Test drift fixed** (test suite now 240/240 green, was 8 failures before this work):
  - `services/__tests__/auth.service.test.ts` — three stale `core-memories://` URLs from the rebrand → updated to `forever-fireflies://auth/callback` and the password-reset URL to `https://foreverfireflies.app/auth/callback`.
  - `services/__tests__/children.service.test.ts` — service was sending `''` for missing nickname; the test (and DB semantics) wanted `null`. Service updated to send `null` (with TS cast — see comment at [services/children.service.ts](../../services/children.service.ts) for why).
  - `hooks/__tests__/useSearchFilter.test.ts` — three test cases used the removed `dateRangeIndex`/`toggleDateRange` API → migrated to the current `dateFilter` / `setDateFilter` API.
  - `components/__tests__/FilterChips.test.tsx` — deleted (component file no longer exists; was replaced by `FilterRow`/`FilterPanel`).
  - `jest.setup.ts` — added a no-op mock for `@sentry/react-native` (its ESM exports were tripping Jest's transformer; tests shouldn't be sending to Sentry anyway).

- **Tested test infrastructure improvement**: any test that touches `useAuthStore` (which transitively imports `lib/sentry.ts`) now works without ESM transform issues.
