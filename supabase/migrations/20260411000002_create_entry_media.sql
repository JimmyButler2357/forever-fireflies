-- Migration 20260411000002: create_entry_media
-- Adds media attachments (photos/videos) to journal entries.
-- Storage path pattern: {user_id}/{entry_id}/photo_{order}.jpg

CREATE TABLE entry_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  storage_path text NOT NULL,
  thumbnail_path text,
  display_order smallint NOT NULL DEFAULT 0,
  width smallint,
  height smallint,
  duration_seconds smallint,
  file_size_bytes integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX entry_media_entry_order_uq
  ON entry_media(entry_id, display_order);

CREATE INDEX entry_media_entry_idx
  ON entry_media(entry_id);

CREATE INDEX entry_media_family_idx
  ON entry_media(family_id);

CREATE INDEX entry_media_user_idx
  ON entry_media(user_id);

ALTER TABLE entry_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY entry_media_select_family ON entry_media
  FOR SELECT USING (family_id IN (SELECT user_family_ids()));

CREATE POLICY entry_media_insert_own ON entry_media
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND family_id IN (SELECT user_family_ids())
  );

CREATE POLICY entry_media_delete_own ON entry_media
  FOR DELETE USING (user_id = auth.uid());

INSERT INTO storage.buckets (id, name, public)
VALUES ('entry-media', 'entry-media', false)
ON CONFLICT (id) DO NOTHING;

-- Users can read objects for entries in their own family.
CREATE POLICY entry_media_storage_select_family ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'entry-media'
    AND EXISTS (
      SELECT 1
      FROM entries e
      WHERE e.id::text = (storage.foldername(name))[2]
        AND e.family_id IN (SELECT user_family_ids())
    )
  );

-- Users can upload media only for their own entries in their own folder.
CREATE POLICY entry_media_storage_insert_own ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'entry-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1
      FROM entries e
      WHERE e.id::text = (storage.foldername(name))[2]
        AND e.user_id = auth.uid()
    )
  );

-- Users can update/replace objects they own in this bucket.
CREATE POLICY entry_media_storage_update_own ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'entry-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'entry-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can remove media they uploaded.
CREATE POLICY entry_media_storage_delete_own ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'entry-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
