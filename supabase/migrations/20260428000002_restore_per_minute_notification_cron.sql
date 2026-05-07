-- Migration 20260428000002: restore_per_minute_notification_cron
--
-- Bug context (from code review 2026-04-28):
-- Migration 035 originally scheduled the send-notifications cron at
-- '* * * * *' (every minute). Migration 037 silently dropped it to
-- '*/5 * * * *' (every 5 minutes) without updating the function.
--
-- The function's matching logic (supabase/functions/send-notifications/index.ts)
-- compares notification_time_utc with an EXACT-string match on the current
-- HH:MM:00. pg_cron has natural jitter — if the every-5-minute job ever
-- fires at :01:30 instead of :00:30, the function reads "12:01:00" and
-- matches NOBODY. Users silently miss their notifications.
--
-- ELI5: Imagine a mailman who only delivers if his watch reads exactly
-- the time printed on the mailbox label. If his watch is even one minute
-- off, that mailbox gets no mail today. With every-5-minute cron + jitter,
-- this happens to a chunk of users every day with no error.
--
-- The fix: restore the every-minute schedule. Cost is tiny — at every
-- minute that's 1,440 cheap indexed lookups/day, well within Supabase
-- pg_cron limits. Re-enabling dedup (separate change in send-notifications
-- function) prevents accidental double-sends if cron ever overlaps.
--
-- Side cleanup: rename the cron job to be accurate. The old name
-- "send-nightly-notifications" was never accurate (it ran every minute
-- in 035, then every 5 in 037). New name describes what it actually does.

-- Drop the old job. Wrapped so re-running this migration on a fresh
-- DB (where the old name doesn't exist) doesn't error out.
DO $$
BEGIN
  PERFORM cron.unschedule('send-nightly-notifications');
EXCEPTION WHEN OTHERS THEN
  -- Job didn't exist; nothing to clean up.
  NULL;
END $$;

-- Also defensively unschedule the new name in case this migration ran
-- partially before. cron.schedule() updates an existing job in place,
-- but explicit cleanup keeps idempotency obvious.
DO $$
BEGIN
  PERFORM cron.unschedule('send-prompt-notifications');
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Schedule the per-minute job. Reads credentials from Supabase Vault
-- because pg_cron runs as a separate background worker that cannot read
-- session-level GUCs (this is exactly the reason migration 037 had to
-- exist). Vault secrets must be inserted manually via SQL Editor:
--
--   INSERT INTO vault.secrets (name, secret)
--   VALUES ('supabase_url', 'https://xutoxnpttbwdiycbzwbp.supabase.co')
--   ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
--
--   INSERT INTO vault.secrets (name, secret)
--   VALUES ('service_role_key', '<YOUR_SERVICE_ROLE_KEY>')
--   ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
SELECT cron.schedule(
  'send-prompt-notifications',
  '* * * * *',  -- every minute; the function filters to one push per user per day
  $$
  SELECT net.http_post(
    url    := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url' LIMIT 1)
              || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1),
      'Content-Type',  'application/json'
    ),
    body   := '{}'::jsonb
  );
  $$
);
