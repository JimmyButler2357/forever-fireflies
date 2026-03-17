-- Migration 035: schedule_notifications_cron
--
-- Sets up a pg_cron job that calls the send-notifications Edge Function
-- every minute. Think of it like a clockwork alarm that rings every 60
-- seconds asking "does anyone need a notification right now?" The Edge
-- Function itself filters by notification_time so users only get one
-- notification per day at their chosen time.
--
-- Prerequisites:
--   - pg_cron extension (enabled on Supabase Pro plans)
--   - pg_net extension (for making HTTP calls from SQL)
--   - send-notifications Edge Function deployed
--   - EXPO_ACCESS_TOKEN secret set on the Edge Function

-- Enable extensions (safe to call multiple times — IF NOT EXISTS)
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule: every minute, call the send-notifications Edge Function.
-- pg_cron uses standard cron syntax: * * * * * = every minute.
-- The Edge Function is called via pg_net's http_post, which makes
-- an async HTTP request from inside PostgreSQL.
SELECT cron.schedule(
  'send-nightly-notifications',   -- job name (used to unschedule later)
  '* * * * *',                    -- every minute
  $$
  SELECT net.http_post(
    url    := current_setting('app.settings.supabase_url') || '/functions/v1/send-notifications',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type',  'application/json'
    ),
    body   := '{}'::jsonb
  );
  $$
);
