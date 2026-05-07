-- Two-User Cross-Access RLS Test
-- =================================
-- Run against a LOCAL Supabase stack OR a Supabase preview branch — NEVER production.
--
-- Prerequisites:
--   1. Start local Supabase: `supabase start` (or create a preview branch)
--   2. Apply all migrations: `supabase db reset` (local) or branch auto-applies them
--   3. Note the local API URL and anon key from `supabase status`
--
-- Method:
--   Step 1 — create two test users via the Auth Admin API (bypasses RLS for setup)
--   Step 2 — for each test, sign in as User B and try to access User A's data
--   Step 3 — every test below MUST return 0 rows. Any row returned is a finding.
--
-- This script is meant to be run as a series of individual commands in psql
-- with the helpers below. For automated execution, see the companion
-- `security-audit-2026-04-28-rls-test.ts` Deno/Node script (TODO: assemble in
-- the rival-model bundle directory).

-- ============================================================
-- SETUP — run once as service role / postgres superuser
-- ============================================================

-- Create User A (service role)
DO $$
DECLARE
  user_a_id uuid;
  user_b_id uuid;
BEGIN
  -- Insert two test users into auth.users.
  -- Note: in real testing, use supabase.auth.admin.createUser via the API
  -- (this raw INSERT skips Supabase's password hashing and email validation).
  -- This DO block is illustrative; use the API in practice.
  RAISE NOTICE 'Create users via supabase.auth.admin.createUser:';
  RAISE NOTICE '  await supabase.auth.admin.createUser({ email: "test-a@example.com", password: "test-password-1", email_confirm: true })';
  RAISE NOTICE '  await supabase.auth.admin.createUser({ email: "test-b@example.com", password: "test-password-2", email_confirm: true })';
END $$;

-- After creating users via the Auth API, the handle_new_user trigger has
-- automatically created profile + family + family_members rows for each.
-- Get the user IDs for the tests below:
--   SELECT id FROM auth.users WHERE email IN ('test-a@example.com', 'test-b@example.com');

-- ============================================================
-- TEST DATA SETUP — sign in as USER A, then run these
-- ============================================================
-- (As User A, via Supabase JS client or PostgREST — RLS will enforce.)

-- A.1 — Add a child as User A
INSERT INTO children (name, birthday, color_index)
  VALUES ('Test Child A', '2023-01-15', 0);
-- (Trigger handle_new_child links it to A's family)

-- A.2 — Create an entry as User A
WITH my_family AS (SELECT family_id FROM family_members WHERE profile_id = auth.uid() LIMIT 1)
INSERT INTO entries (user_id, family_id, transcript, entry_type)
SELECT auth.uid(), family_id, 'A''s private memory: confidential transcript', 'voice'
FROM my_family;

-- Note A's entry id, child id, family id for later assertions.

-- ============================================================
-- THE ACTUAL TESTS — sign in as USER B, then run these.
-- Every query MUST return 0 rows. Any non-zero result is a security finding.
-- ============================================================

-- TEST 1 — B cannot see A's profile
SELECT id, display_name FROM profiles WHERE id != auth.uid();
-- Expected: 0 rows (profiles_select_own filters to id = auth.uid())

-- TEST 2 — B cannot see A's family
SELECT id, created_by FROM families WHERE created_by != auth.uid();
-- Expected: 0 rows (families_select_member filters to user_family_ids())

-- TEST 3 — B cannot see A's family_members rows
SELECT family_id, profile_id, role FROM family_members WHERE profile_id != auth.uid();
-- Expected: 0 rows (family_members_select_family filters to user_family_ids())

-- TEST 4 — B cannot see A's children
-- (Child names are PII — this is the most important test.)
SELECT id, name, birthday FROM children;
-- Expected: 0 rows (children_select_family filters via family_children → user_family_ids)

-- TEST 5 — B cannot see A's family_children junction rows
SELECT family_id, child_id FROM family_children;
-- Expected: 0 rows

-- TEST 6 — B cannot see A's entries
-- (Transcripts are PII — second-most important test.)
SELECT id, transcript FROM entries;
-- Expected: 0 rows (entries_select_family filters to user_family_ids())

-- TEST 7 — B cannot see A's entry_children junction rows
SELECT entry_id, child_id FROM entry_children;
-- Expected: 0 rows

-- TEST 8 — B cannot see A's entry_tags junction rows
SELECT entry_id, tag_id FROM entry_tags;
-- Expected: 0 rows

-- TEST 9 — B cannot see A's entry_media rows
SELECT id, storage_path FROM entry_media;
-- Expected: 0 rows

-- TEST 10 — B cannot see A's user_devices rows
SELECT id, push_token FROM user_devices WHERE profile_id != auth.uid();
-- Expected: 0 rows

-- TEST 11 — B cannot see A's notification_log rows
SELECT id FROM notification_log WHERE profile_id != auth.uid();
-- Expected: 0 rows

-- TEST 12 — B cannot see A's prompt_history rows
SELECT id FROM prompt_history WHERE profile_id != auth.uid();
-- Expected: 0 rows

-- ============================================================
-- WRITE TESTS — try to mutate A's data as B. All should return 0 rows affected.
-- ============================================================

-- TEST 13 — B cannot update A's profile
UPDATE profiles SET display_name = 'pwned' WHERE id != auth.uid();
-- Expected: 0 rows updated

-- TEST 14 — B cannot escalate own role to owner of A's family (the 021 fix)
UPDATE family_members SET role = 'owner' WHERE profile_id = auth.uid();
-- Expected: error or 0 rows (the family_members_update_own policy was REMOVED in 021)

-- TEST 15 — B cannot insert a family_member into A's family
-- (Need A's family_id from setup phase — substitute the actual UUID here.)
INSERT INTO family_members (family_id, profile_id, role, status)
VALUES ('<A_FAMILY_ID_HERE>', auth.uid(), 'owner', 'active');
-- Expected: error (B is not owner of A's family)

-- TEST 16 — B cannot update A's child
UPDATE children SET name = 'pwned';
-- Expected: 0 rows updated (no rows are visible to UPDATE)

-- TEST 17 — B cannot delete A's child
DELETE FROM children;
-- Expected: 0 rows deleted

-- TEST 18 — B cannot update A's entry transcript (the central PII)
UPDATE entries SET transcript = 'B was here';
-- Expected: 0 rows updated

-- TEST 19 — B cannot delete A's entry
DELETE FROM entries;
-- Expected: 0 rows deleted

-- TEST 20 — B cannot insert an entry into A's family
INSERT INTO entries (user_id, family_id, transcript, entry_type)
VALUES (auth.uid(), '<A_FAMILY_ID_HERE>', 'cross-family insert', 'text');
-- Expected: error (entries_insert_own WITH CHECK requires family_id IN user_family_ids)

-- TEST 21 — B cannot insert an entry pretending to be A
INSERT INTO entries (user_id, family_id, transcript, entry_type)
VALUES ('<A_USER_ID_HERE>', (SELECT family_id FROM family_members WHERE profile_id = auth.uid() LIMIT 1), 'spoofed insert', 'text');
-- Expected: error (entries_insert_own WITH CHECK requires user_id = auth.uid)

-- ============================================================
-- BILLING GUARD TEST — verify the guard_subscription_fields trigger
-- ============================================================

-- TEST 22 — B cannot give themselves premium
UPDATE profiles SET subscription_status = 'active', trial_ends_at = '2099-01-01' WHERE id = auth.uid();
-- Now re-fetch:
SELECT subscription_status, trial_ends_at FROM profiles WHERE id = auth.uid();
-- Expected: subscription_status is 'trial' (or original value), trial_ends_at unchanged.
-- The UPDATE silently reverts via the BEFORE UPDATE trigger.

-- ============================================================
-- HARD-DELETE GUARD — verify the 30-day soft-delete window
-- ============================================================

-- TEST 23 — B cannot hard-delete their own non-soft-deleted entry
-- (As B, with B's own entry that is_deleted = false)
DELETE FROM entries WHERE user_id = auth.uid() AND is_deleted = false;
-- Expected: 0 rows deleted (entries_delete_own requires is_deleted = true AND deleted_at < NOW() - 30 days)

-- TEST 24 — B cannot hard-delete a soft-deleted entry that's < 30 days old
-- (Soft-delete first)
UPDATE entries SET is_deleted = true, deleted_at = now() WHERE id = '<B_ENTRY_ID>';
-- Try to hard-delete immediately
DELETE FROM entries WHERE id = '<B_ENTRY_ID>';
-- Expected: 0 rows deleted (deleted_at is now(), not < now() - 30 days)

-- ============================================================
-- STORAGE TESTS (require Supabase Storage API, not raw SQL)
-- ============================================================

-- These must be run via the Supabase JS client. Pseudocode:
--
-- // As User B:
-- const { data, error } = await supabase.storage
--   .from('audio-recordings')
--   .download('<A_USER_ID>/<A_ENTRY_ID>.wav');
-- // Expected: error (403 forbidden, audio_select_own enforces foldername()[1] = auth.uid())
--
-- const { error: uploadError } = await supabase.storage
--   .from('audio-recordings')
--   .upload('<A_USER_ID>/spoofed.wav', new Blob(['spoofed']));
-- // Expected: error (audio_insert_own enforces foldername()[1] = auth.uid())
--
-- const { error: deleteError } = await supabase.storage
--   .from('audio-recordings')
--   .remove(['<A_USER_ID>/<A_ENTRY_ID>.wav']);
-- // Expected: error or 0 paths actually removed

-- ============================================================
-- PASS CRITERIA
-- ============================================================
-- All 24 tests must satisfy their "Expected" outcome.
-- Any deviation is a security finding to add to the audit doc.
