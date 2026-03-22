-- Migration 040: start_trial RPC
-- Called once when the user saves their first entry. Sets trial_started_at
-- to now() — but only if it hasn't been set yet (idempotent).
--
-- SECURITY DEFINER means this function runs with the permissions of whoever
-- CREATED it (the database owner), not whoever CALLED it. This is needed
-- because the guard trigger (migration 039) blocks regular users from
-- changing trial_started_at. The RPC bypasses the guard because it runs
-- as the owner — like a staff member who has the master key.
--
-- Idempotent means "calling it twice has the same effect as calling it once."
-- The WHERE clause `AND trial_started_at IS NULL` ensures the timestamp
-- is only set the first time — subsequent calls are harmless no-ops.

CREATE OR REPLACE FUNCTION start_trial()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET trial_started_at = now()
  WHERE id = auth.uid()
    AND trial_started_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
