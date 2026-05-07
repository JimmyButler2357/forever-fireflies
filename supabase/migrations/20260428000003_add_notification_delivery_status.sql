-- Migration 20260428000003: add_notification_delivery_status
--
-- Bug context (from code review 2026-04-28, finding #5):
-- The send-notifications cron writes a notification_log row BEFORE calling
-- the Expo Push API. If the push then fails (Expo down, network blip, bad
-- token), the row stays — saying we sent something we didn't.
--
-- Now that dedup is back on (review fix #3), this becomes a real bug:
-- the dedup query treats that bogus row as "user got a notification today"
-- and silently blocks tomorrow's legit send. Failed pushes turn into
-- multi-day silence.
--
-- ELI5: It's like writing "package delivered" in the logbook before the
-- courier actually drops the package off. If they trip on the way out
-- the door, the logbook is now lying — and the next day the dispatcher
-- sees yesterday's "delivered" and skips your house.
--
-- Fix: a delivery_status column. Rows start 'pending', flip to 'sent'
-- once Expo confirms, or 'failed' if Expo errors. Dedup only counts
-- 'sent' rows.

ALTER TABLE notification_log
  ADD COLUMN delivery_status text NOT NULL DEFAULT 'pending'
  CHECK (delivery_status IN ('pending', 'sent', 'failed'));

-- Backfill: every existing row pre-dates this fix, and the only way it
-- ended up in the table is via the old "log first, push, then continue
-- on push error" flow. We can't tell which were truly delivered, but the
-- safer default for dedup is to assume they WERE — that just means a few
-- historical users may miss a single day's notification, which is far
-- better than a flood of duplicates if we marked them all 'pending'.
UPDATE notification_log SET delivery_status = 'sent';

-- The existing index idx_notification_log_profile_sent on
-- (profile_id, sent_at DESC) already handles the dedup query. Postgres
-- can filter on delivery_status after the index lookup. No new index
-- needed at current scale.
