// Delete Account — Supabase Edge Function
//
// Permanently deletes a user's account and all associated data.
// Called from the app when a user taps "Delete My Account" in Settings.
//
// What it does (in order):
// 1. Verifies the user's identity from their auth token
// 2. Deletes all their audio files from Storage
// 3. Deletes them from auth.users — which cascades through the
//    entire database (profiles, entries, families, etc.)
//
// Why storage first? If we deleted the user first, their files
// would be orphaned forever with no way to find them. By deleting
// files first, the user still exists and can retry if something
// goes wrong.
//
// Supabase automatically revokes Apple Sign-In tokens when
// auth.admin.deleteUser() is called (supabase-auth v2.60+).
//
// To deploy:
//   supabase functions deploy delete-account

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET = 'audio-recordings';

Deno.serve(async (req) => {
  try {
    // Use the service role key so we can bypass RLS and call admin methods
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── Step 1: Verify the user's identity ──────────────────────
    // We extract the Bearer token they sent and verify it server-side.
    // This ensures we NEVER trust a caller-supplied userId — we derive
    // it from the authenticated token instead.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid or expired token' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const userId = user.id;
    console.log(`Starting account deletion for user ${userId}`);

    // ── Step 2: Delete audio files from Storage ─────────────────
    // Files are stored as {userId}/{entryId}.wav. We list everything
    // under the user's folder and batch-delete it all.
    const { data: files, error: listError } = await supabase.storage
      .from(BUCKET)
      .list(userId);

    let audioFilesDeleted = 0;

    if (listError) {
      // Log but don't abort — deleting the user is more important
      // than cleaning up audio files.
      console.warn('Failed to list audio files:', listError.message);
    } else if (files && files.length > 0) {
      const paths = files.map((f) => `${userId}/${f.name}`);
      const { error: removeError } = await supabase.storage
        .from(BUCKET)
        .remove(paths);

      if (removeError) {
        console.warn('Some audio files failed to delete:', removeError.message);
      } else {
        audioFilesDeleted = paths.length;
      }
    }

    // ── Step 3: Delete the user from auth.users ─────────────────
    // This is the critical step. ON DELETE CASCADE on profiles.id
    // means this single delete cascades through every table:
    // profiles → entries, families, user_devices, notification_log,
    // prompt_history → entry_children, entry_tags, family_members,
    // family_children, tags.
    //
    // Supabase also auto-revokes Apple Sign-In tokens here.
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError.message);
      return new Response(
        JSON.stringify({ success: false, error: deleteError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    }

    console.log(`Account deleted: user ${userId}, ${audioFilesDeleted} audio files removed`);

    return new Response(
      JSON.stringify({ success: true, audioFilesDeleted }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('Unexpected error in delete-account:', err);
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
