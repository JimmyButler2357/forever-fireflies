# Files to attach to the rival-model session

Paste the contents (or upload the files) in this order. The model should be able to navigate between files using the `--- FILE: <path> ---` delimiter pattern.

## High-priority (paste these even if the model can only handle ~30K tokens)

### Backend
- `supabase/migrations/20260301000019_create_rls_policies.sql` — primary RLS
- `supabase/migrations/20260301000021_fix_rls_policies.sql` — three documented critical fixes
- `supabase/migrations/20260301000023_fix_fk_cascades_and_search_path.sql` — search_path hardening
- `supabase/migrations/20260301000024_fix_hard_delete_and_child_trigger.sql` — soft-delete window
- `supabase/migrations/20260301000026_guard_subscription_fields.sql` — billing guard trigger
- `supabase/migrations/20260301000028_fix_entries_update_policy.sql` — family_id pinning on UPDATE
- `supabase/migrations/20260301000029_add_check_constraints.sql` — column-level constraints
- `supabase/migrations/20260301000031_create_junction_rpcs.sql` — atomic RPCs
- `supabase/migrations/20260301000032_fix_children_insert_policy.sql` — RLS quirk workaround
- `supabase/migrations/20260301000033_create_child_rpc.sql` — `create_child` RPC
- `supabase/migrations/20260301000034_refresh_auto_detection_rpcs.sql` — auto-tag RPCs
- `supabase/migrations/20260301000035_schedule_notifications_cron.sql` — cron job
- `supabase/migrations/20260301000037_fix_cron_vault.sql` — vault-stored secrets for cron
- `supabase/migrations/20260411000001_create_profile_photos_bucket.sql` — profile-photos storage
- `supabase/migrations/20260411000002_create_entry_media.sql` — entry-media storage + table
- `supabase/migrations/20260301000005_create_auto_family_trigger.sql` — `handle_new_user`
- `supabase/migrations/20260301000007_create_family_children.sql` — `handle_new_child`
- `supabase/migrations/20260324031506_register_device_rpc.sql` — `register_device`
- `supabase/migrations/20260301000040_start_trial_rpc.sql` — `start_trial`
- `supabase/config.toml` — auth + functions config

### Edge Functions
- `supabase/functions/process-entry/index.ts`
- `supabase/functions/send-notifications/index.ts`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/purge-deleted/index.ts`

### Client (security-critical)
- `services/auth.service.ts`
- `services/storage.service.ts`
- `services/entries.service.ts`
- `app/_layout.tsx` — deep-link handler + auth state listener
- `stores/authStore.ts` — sign-out / store clearing
- `stores/draftStore.ts`
- `stores/childrenStore.ts`
- `stores/entriesStore.ts`
- `lib/sentry.ts` — PII scrubbing
- `lib/posthog.ts` — analytics identification
- `lib/config.ts` — bypass paywall flag
- `lib/supabase.ts` — client config

### Build & secrets surface
- `eas.json`
- `app.json`
- `app.config.js`
- `.gitignore`
- `package.json`

### Static landing
- `landing/index.html`
- `landing/auth/callback.html`
- `landing/privacy.html`
- `landing/delete-account.html`

## Lower-priority (only attach if the model has token budget)

- All other migrations not listed above (table creation; mostly schema, less RLS)
- `services/children.service.ts`, `services/families.service.ts`, `services/profiles.service.ts`, `services/notifications.service.ts`, `services/audioCleanup.service.ts`, `services/prompts.service.ts`, `services/tags.service.ts`
- `app/(onboarding)/reset-password.tsx`
- `app/(onboarding)/email-auth.tsx`
- `app/(onboarding)/forgot-password.tsx`
- `hooks/useNotifications.ts`
- `lib/revenueCat.ts`

## Files to NOT attach

- `.env.local` (real secrets)
- `node_modules/` (noise)
- `landing/playgrounds/` (experimental, not security-relevant)
- Anything under `__tests__/` or `__mocks__/`
- The audit doc itself (`docs/testing/security-audit-2026-04-28.md`) — would bias the rival model toward the same findings
