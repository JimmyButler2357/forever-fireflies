-- Migration 039: Add trial_started_at to profiles
-- Tracks when the user's 7-day free trial began (set when first entry is saved).
-- Also updates the guard trigger to protect this field from client-side tampering.
--
-- Think of trial_started_at like a stamp on your hand at a theme park —
-- once stamped, it can't be reset. The guard trigger is the bouncer who
-- makes sure only park staff can stamp hands.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_started_at timestamptz;

-- Update the guard trigger to also protect trial_started_at.
-- The existing trigger (migration 026) protects subscription_status and trial_ends_at.
-- We add trial_started_at to the same function so users can't reset their trial.
CREATE OR REPLACE FUNCTION guard_subscription_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at
     OR NEW.trial_started_at IS DISTINCT FROM OLD.trial_started_at THEN
    IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role' THEN
      NEW.subscription_status := OLD.subscription_status;
      NEW.trial_ends_at := OLD.trial_ends_at;
      NEW.trial_started_at := OLD.trial_started_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;
