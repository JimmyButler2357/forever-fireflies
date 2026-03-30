-- Migration: register_device RPC
-- Safely registers or reassigns a push token to the current user.
--
-- Why SECURITY DEFINER? Push tokens belong to physical devices, not users.
-- When user A logs out and user B logs in on the same phone, the push token
-- stays the same. But RLS blocks user B from updating user A's row.
-- This function runs as the DB owner so it can delete the old row first,
-- then insert a fresh one for the current user.

CREATE OR REPLACE FUNCTION register_device(
  p_push_token TEXT,
  p_platform TEXT,
  p_device_name TEXT DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_device_id uuid;
BEGIN
  -- Must be authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Remove any existing row with this push token (might belong to a
  -- different user who previously used this device)
  DELETE FROM user_devices WHERE push_token = p_push_token;

  -- Insert a fresh row for the current user
  INSERT INTO user_devices (profile_id, push_token, platform, device_name, is_active, last_active_at)
  VALUES (v_user_id, p_push_token, p_platform, p_device_name, true, now())
  RETURNING id INTO v_device_id;

  RETURN v_device_id;
END;
$$;
