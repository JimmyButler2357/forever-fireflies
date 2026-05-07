-- Migration 20260428000001: add_entry_media_update_policy
--
-- Bug context (from code review 2026-04-28):
-- The original migration that created entry_media (20260411000002) added RLS
-- policies for SELECT, INSERT, and DELETE — but NOT for UPDATE. With RLS
-- enabled, "no UPDATE policy" is treated as "UPDATE forbidden for everyone".
--
-- ELI5: An RLS policy is like a doorman that decides which rows you're
-- allowed to read or change. The original migration installed doormen for
-- "Read", "Write new", and "Delete" — but forgot the "Edit" doorman. With
-- the doorman missing, nobody is allowed to edit, even the row's owner.
--
-- That silently broke any feature that needed to UPDATE entry_media:
--   - Reordering photos (requires updating display_order)
--   - Filling in width/height/file_size_bytes after the upload finishes
--
-- This migration adds the missing doorman. It mirrors the pattern of the
-- DELETE policy on the same table (line 44 of migration 20260411000002):
-- only the row's original uploader can update it, never another family
-- member. That keeps photo ownership clean even though the rest of the
-- family can SEE the photo via the family-wide SELECT policy.

CREATE POLICY entry_media_update_own ON entry_media
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
