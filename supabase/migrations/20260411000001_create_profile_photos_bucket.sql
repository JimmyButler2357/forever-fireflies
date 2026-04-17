-- Migration 20260411000001: create_profile_photos_bucket
-- Adds private storage for child profile photos.
-- Path pattern: {family_id}/{child_id}.jpg

INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-photos', 'profile-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Family members can read photos in their own family folder.
CREATE POLICY profile_photos_select_family ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND EXISTS (
      SELECT 1
      FROM family_members fm
      WHERE fm.profile_id = auth.uid()
        AND fm.status = 'active'
        AND fm.family_id::text = (storage.foldername(name))[1]
    )
  );

-- Family members can upload/replace photos in their own family folder.
CREATE POLICY profile_photos_insert_family ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND EXISTS (
      SELECT 1
      FROM family_members fm
      WHERE fm.profile_id = auth.uid()
        AND fm.status = 'active'
        AND fm.family_id::text = (storage.foldername(name))[1]
    )
  );

-- Family members can replace photos in their own family folder.
CREATE POLICY profile_photos_update_family ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND EXISTS (
      SELECT 1
      FROM family_members fm
      WHERE fm.profile_id = auth.uid()
        AND fm.status = 'active'
        AND fm.family_id::text = (storage.foldername(name))[1]
    )
  )
  WITH CHECK (
    bucket_id = 'profile-photos'
    AND EXISTS (
      SELECT 1
      FROM family_members fm
      WHERE fm.profile_id = auth.uid()
        AND fm.status = 'active'
        AND fm.family_id::text = (storage.foldername(name))[1]
    )
  );

-- Family members can delete photos in their own family folder.
CREATE POLICY profile_photos_delete_family ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'profile-photos'
    AND EXISTS (
      SELECT 1
      FROM family_members fm
      WHERE fm.profile_id = auth.uid()
        AND fm.status = 'active'
        AND fm.family_id::text = (storage.foldername(name))[1]
    )
  );
