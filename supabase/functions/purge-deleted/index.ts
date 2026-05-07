// Purge Deleted Entries — Supabase Edge Function
//
// This function runs daily via a cron trigger and permanently
// deletes entries that have been in the "trash" for more than
// 30 days. It also cleans up their audio files from Storage.
//
// Think of it like a janitor who empties the recycling bin
// once a day — anything that's been sitting there for a month
// gets permanently removed.
//
// To deploy:
//   supabase functions deploy purge-deleted
//
// To set up the daily cron trigger, follow the same vault-secret pattern
// used by send-notifications (see migration 20260428000002). pg_cron reads
// the service role key from vault.decrypted_secrets at runtime — do NOT
// paste the literal key into a SQL migration file (security audit 2-H).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const BUCKET = 'audio-recordings';

/** Returns the entry's audio path if it's safely user-scoped, or null
 *  (with a security log) if it isn't. The caller filters nulls out so
 *  cross-user paths never reach the storage delete batch. */
function safeAudioPath(e: { id: string; user_id: string; audio_storage_path: string | null }): string | null {
  if (!e.audio_storage_path) return null;
  if (e.audio_storage_path.startsWith(`${e.user_id}/`)) return e.audio_storage_path;
  console.error(
    '[PURGE][SECURITY] Skipping cross-user audio path; entry will be deleted but file will not',
    {
      entryId: e.id,
      ownerId: e.user_id,
      pathFirstFolder: e.audio_storage_path.split('/')[0],
    },
  );
  return null;
}

Deno.serve(async (req) => {
  // Bearer-token gate: only pg_cron may invoke this. verify_jwt = false in
  // config.toml lets pg_cron through without a user JWT, but without this
  // manual check anyone with the URL could trigger early purges. Combined
  // with the (now-fixed) audit finding 2-A, an unauthenticated attacker
  // could prematurely purge cross-user-pointing audio paths in any legacy
  // rows. pg_cron sends Bearer <service_role_key> from the vault entry
  // (security audit 2-C).
  const expectedToken = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!expectedToken || req.headers.get('Authorization') !== `Bearer ${expectedToken}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      expectedToken,
    );

    // Find entries soft-deleted more than 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: staleEntries, error: fetchError } = await supabase
      .from('entries')
      .select('id, user_id, audio_storage_path')
      .eq('is_deleted', true)
      .lt('deleted_at', thirtyDaysAgo.toISOString());

    if (fetchError) {
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500 },
      );
    }

    if (!staleEntries || staleEntries.length === 0) {
      return new Response(
        JSON.stringify({ purged: 0, message: 'No entries to purge' }),
        { status: 200 },
      );
    }

    // Delete audio files from Storage. Supabase's batch .remove() is
    // all-or-nothing at the API level — if it errors, NONE of the files
    // were deleted. (Missing files aren't errors; only auth/network are.)
    //
    // safeAudioPath() drops any path whose first folder doesn't match the
    // entry owner's user_id. The DB CHECK constraint and the service-layer
    // guard already prevent this on the write path; this is a third defense
    // layer for legacy rows or any service-role write that bypassed both.
    // TODO: route [PURGE][SECURITY] events to Sentry or a security_events
    // table once we add that infra.
    const audioPaths = staleEntries
      .map(safeAudioPath)
      .filter((p): p is string => p != null);

    let audioRemovalFailed = false;
    if (audioPaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove(audioPaths);

      if (storageError) {
        // Previously the function logged a warning and deleted DB rows
        // anyway, leaving audio files orphaned forever (review fix #6).
        // Now we defer: only entries with NO audio_storage_path are safe
        // to purge in this run; the rest stay until next day's run when
        // we'll retry the storage removal.
        console.warn('[PURGE] Storage batch removal failed; deferring entries with audio:', storageError.message);
        audioRemovalFailed = true;
      }
    }

    // Decide which DB rows to delete this run.
    // - If audio removal succeeded (or there were no audio files at all),
    //   we can safely delete every stale entry.
    // - If audio removal failed, only delete entries that had no audio
    //   path — they cannot orphan anything. The rest get retried tomorrow.
    const entriesToDelete = audioRemovalFailed
      ? staleEntries.filter((e) => e.audio_storage_path == null)
      : staleEntries;
    const deferredCount = staleEntries.length - entriesToDelete.length;
    const entryIds = entriesToDelete.map((e) => e.id);

    if (entryIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('entries')
        .delete()
        .in('id', entryIds);

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 500 },
        );
      }
    }

    return new Response(
      JSON.stringify({
        purged: entryIds.length,
        audioFilesDeleted: audioRemovalFailed ? 0 : audioPaths.length,
        deferred: deferredCount,
        deferredReason: audioRemovalFailed
          ? 'Storage batch removal failed; will retry next run'
          : undefined,
      }),
      { status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500 },
    );
  }
});
