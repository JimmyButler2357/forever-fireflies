-- Migration 036: add_profile_timezone + notification_time_utc
--
-- Two new columns:
--
-- 1. `timezone` — the user's IANA timezone (e.g. "America/New_York").
--    Auto-detected from the device and synced on every app open.
--
-- 2. `notification_time_utc` — the user's notification_time converted
--    to UTC. This is what the Edge Function queries against, so it
--    can do a simple `WHERE notification_time_utc = current_utc_slot`
--    instead of loading every profile and doing timezone math.
--
-- Think of it like each house posting a "deliver at 1:30 AM UTC" sign
-- on their mailbox — the mailman only needs one clock (UTC) and just
-- reads the signs that match.
--
-- The client recomputes notification_time_utc on every app open to
-- handle daylight saving time shifts automatically.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS notification_time_utc time DEFAULT '20:30';
