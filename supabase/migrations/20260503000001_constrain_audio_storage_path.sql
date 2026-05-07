-- Migration: constrain audio_storage_path to user-scoped paths
--
-- Without this, a user can UPDATE their own entry's audio_storage_path to
-- point at another user's audio file. When purge-deleted later runs as
-- service role, it would delete the other user's file. RLS on the entries
-- table allows the column write; storage RLS does not protect the delete
-- because service role bypasses storage RLS.
--
-- Layer 1 (app): services/entries.service.ts validates on every write.
-- Layer 2 (this migration): DB CHECK rejects malformed paths at write time.
-- Layer 3 (edge): purge-deleted filters paths whose first folder mismatches.
--
-- ADD CONSTRAINT ... NOT VALID + a separate VALIDATE pass keeps the table
-- unlocked during the deploy: new writes are rejected immediately, while
-- the full-table re-check of existing rows runs as a non-blocking scan.
-- Safe to run together because the entries table is small today; split
-- the VALIDATE into its own migration if it ever grows past ~100k rows.

ALTER TABLE entries
  ADD CONSTRAINT entries_audio_path_user_scoped
  CHECK (
    audio_storage_path IS NULL
    OR audio_storage_path = user_id::text || '/' || id::text || '.wav'
  )
  NOT VALID;

ALTER TABLE entries VALIDATE CONSTRAINT entries_audio_path_user_scoped;

COMMENT ON CONSTRAINT entries_audio_path_user_scoped ON entries IS
  'audio_storage_path must equal {user_id}/{entry_id}.wav. Prevents a user from rewriting their entry''s path to point at another user''s file (which purge-deleted, running as service role, would then delete).';
