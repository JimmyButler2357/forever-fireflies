-- Fix: pg_cron can't read current_setting() GUC variables because it runs
-- as a separate background worker process without those settings loaded.
-- Solution: Read from Supabase Vault instead. The vault secrets must be
-- inserted manually via SQL Editor (to keep secrets out of git).
--
-- Prerequisites (run manually in SQL Editor first):
--   INSERT INTO vault.secrets (name, secret)
--   VALUES ('supabase_url', 'https://xutoxnpttbwdiycbzwbp.supabase.co')
--   ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
--
--   INSERT INTO vault.secrets (name, secret)
--   VALUES ('service_role_key', '<YOUR_SERVICE_ROLE_KEY>')
--   ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;

-- Unschedule the broken cron job that used current_setting()
SELECT cron.unschedule('send-nightly-notifications');

-- Reschedule using vault lookups (pg_cron CAN read from vault)
SELECT cron.schedule(
  'send-nightly-notifications',
  '*/5 * * * *',
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
