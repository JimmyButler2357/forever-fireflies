// Storage service — upload, download, and delete audio recordings.
// Files are stored in a private Supabase Storage bucket with RLS,
// so each user can only access their own audio files.
// Path pattern: {user_id}/{entry_id}.wav

import { File as ExpoFile, Paths } from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { capture } from '@/lib/posthog';

const AUDIO_BUCKET = 'audio-recordings';
const PROFILE_PHOTO_BUCKET = 'profile-photos';
const ENTRY_MEDIA_BUCKET = 'entry-media';

/** Canonical audio storage path. The DB CHECK constraint
 *  `entries_audio_path_user_scoped` enforces this exact format —
 *  if you change the format here, also update the migration. */
export const buildAudioPath = (userId: string, entryId: string): string =>
  `${userId}/${entryId}.wav`;

async function getCurrentUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Not authenticated');
  return session.user.id;
}

// Module-level cache for the current user's family IDs. The RPC call costs
// a network round-trip; the result is stable for the entire user session
// (an MVP user belongs to exactly one family, and family membership rarely
// changes). Keying on userId means the cache auto-invalidates when the
// signed-in user changes — no manual reset needed on sign-out.
//
// Why this matters (review fix #12): EntryCard renders up to 3 photos per
// entry, and getEntryMediaUrl previously called this RPC on every photo.
// A 20-card timeline = 60 round-trips just to ask "which families am I in?"
// — and the answer never changed.
let cachedFamilyIds: { userId: string; value: string[]; expiresAt: number } | null = null;
const FAMILY_IDS_TTL_MS = 5 * 60 * 1000; // 5 min — short enough to pick up rare membership changes

async function getUserFamilyIds(): Promise<string[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const currentUserId = session?.user?.id ?? '';
  const now = Date.now();
  if (
    cachedFamilyIds &&
    cachedFamilyIds.userId === currentUserId &&
    now < cachedFamilyIds.expiresAt
  ) {
    return cachedFamilyIds.value;
  }
  const { data, error } = await supabase.rpc('user_family_ids');
  if (error) throw new Error(`Failed to resolve family membership: ${error.message}`, { cause: error });
  const value = data ?? [];
  cachedFamilyIds = { userId: currentUserId, value, expiresAt: now + FAMILY_IDS_TTL_MS };
  return value;
}

async function ensureFamilyAccess(familyId: string) {
  const familyIds = await getUserFamilyIds();
  if (!familyIds.includes(familyId)) {
    throw new Error('Access denied — you are not a member of this family');
  }
}

async function ensureChildPhotoAccess(storagePath: string) {
  const [familyId] = storagePath.split('/');
  if (!familyId) throw new Error('Invalid child photo path');
  await ensureFamilyAccess(familyId);
}

export const storageService = {
  /** Upload an audio file for an entry.
   *  Derives the user ID from the authenticated session (not caller-supplied)
   *  so storage paths can't be spoofed. */
  async uploadAudio(entryId: string, fileUri: string) {
    // Get user ID from the cached session — faster than getUser()
    // which always hits the network. RLS is the real security check.
    const userId = await getCurrentUserId();

    const path = buildAudioPath(userId, entryId);

    const start = Date.now();
    // Read the local file as an ArrayBuffer via expo-file-system.
    // React Native's fetch().blob() produces malformed data that
    // Supabase Storage rejects (HTTP 400). The expo-file-system
    // File class reads local files reliably and its arrayBuffer()
    // method gives us the format Supabase accepts.
    const file = new ExpoFile(fileUri);
    const arrayBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: 'audio/wav',
        upsert: true,  // Allow re-recording (overwrite existing file for same entry)
      });

    if (error) {
      capture('audio_upload_completed', { durationMs: Date.now() - start, success: false });
      throw new Error(`Failed to upload audio: ${error.message}`, { cause: error });
    }
    capture('audio_upload_completed', { durationMs: Date.now() - start, success: true });
    return data.path;
  },

  /** Get a signed URL for audio playback (valid for 1 hour).
   *  Validates the path belongs to the current user before requesting. */
  async getPlaybackUrl(storagePath: string): Promise<string> {
    const userId = await getCurrentUserId();
    if (!storagePath.startsWith(`${userId}/`)) {
      throw new Error('Access denied — cannot access another user\'s audio');
    }

    const { data, error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .createSignedUrl(storagePath, 3600); // 3600 seconds = 1 hour

    if (error) throw new Error(`Failed to get playback URL: ${error.message}`, { cause: error });
    return data.signedUrl;
  },

  /** Delete an audio file.
   *  Validates the path belongs to the current user before deleting. */
  async deleteAudio(storagePath: string) {
    const userId = await getCurrentUserId();
    if (!storagePath.startsWith(`${userId}/`)) {
      throw new Error('Access denied — cannot delete another user\'s audio');
    }

    const { error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .remove([storagePath]);

    if (error) throw new Error(`Failed to delete audio: ${error.message}`, { cause: error });
  },

  /** Download an audio file to local cache for concatenation.
   *  Gets a signed URL, fetches the bytes, and writes them locally.
   *  Returns the local file URI so it can be passed to concatWavFiles(). */
  async downloadAudio(storagePath: string): Promise<string> {
    // getPlaybackUrl already validates auth + ownership
    const signedUrl = await this.getPlaybackUrl(storagePath);

    // Fetch the audio bytes from the signed URL
    const response = await fetch(signedUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio: HTTP ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    // Write to a temp file in cache (auto-cleaned by the OS when space is needed)
    const localFile = new ExpoFile(Paths.cache, `download_${Date.now()}.wav`);
    await localFile.write(new Uint8Array(arrayBuffer));

    return localFile.uri;
  },

  /** Upload/replace a child profile photo in the family folder. */
  async uploadChildPhoto(familyId: string, childId: string, fileUri: string) {
    await ensureFamilyAccess(familyId);
    const path = `${familyId}/${childId}.jpg`;
    const file = new ExpoFile(fileUri);
    const arrayBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw new Error(`Failed to upload child photo: ${error.message}`, { cause: error });
    return data.path;
  },

  /** Get a signed URL for a child profile photo. */
  async getChildPhotoUrl(storagePath: string): Promise<string> {
    await ensureChildPhotoAccess(storagePath);

    const { data, error } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .createSignedUrl(storagePath, 3600);

    if (error) throw new Error(`Failed to get child photo URL: ${error.message}`, { cause: error });
    return data.signedUrl;
  },

  /** Delete a child profile photo from storage. */
  async removeChildPhoto(storagePath: string) {
    await ensureChildPhotoAccess(storagePath);
    const { error } = await supabase.storage
      .from(PROFILE_PHOTO_BUCKET)
      .remove([storagePath]);
    if (error) throw new Error(`Failed to delete child photo: ${error.message}`, { cause: error });
  },

  /** Upload/replace an entry photo in the current user's folder.
   *
   *  Defense-in-depth: verify the entry belongs to the current user
   *  BEFORE building the path or uploading. Storage RLS would also
   *  reject cross-user uploads via its `e.user_id = auth.uid()` check,
   *  but a service-layer error gives the caller a clear "access denied"
   *  message instead of a generic Supabase 403 (review fix #16). */
  async uploadEntryPhoto(entryId: string, fileUri: string, displayOrder: number) {
    const userId = await getCurrentUserId();

    const { data: entry, error: ownerError } = await supabase
      .from('entries')
      .select('user_id')
      .eq('id', entryId)
      .single();
    if (ownerError) {
      throw new Error(`Failed to verify entry ownership: ${ownerError.message}`, { cause: ownerError });
    }
    if (!entry || entry.user_id !== userId) {
      throw new Error('Access denied — cannot upload to another user\'s entry');
    }

    const path = `${userId}/${entryId}/photo_${displayOrder}.jpg`;
    const file = new ExpoFile(fileUri);
    const arrayBuffer = await file.arrayBuffer();

    const { data, error } = await supabase.storage
      .from(ENTRY_MEDIA_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (error) throw new Error(`Failed to upload entry photo: ${error.message}`, { cause: error });
    return data.path;
  },

  /** Get a signed URL for an entry media object.
   *
   *  Pass `knownFamilyId` (e.g. from `useAuthStore.getState().familyId`)
   *  when the caller already knows which family the entry belongs to.
   *  That skips the per-photo `entries` lookup that would otherwise run
   *  for every single photo in a timeline render (review fix #12).
   *
   *  If `knownFamilyId` is omitted, falls back to looking up the entry's
   *  family_id from the DB — same behavior as before. */
  async getEntryMediaUrl(storagePath: string, knownFamilyId?: string): Promise<string> {
    const parts = storagePath.split('/');
    if (parts.length < 3) throw new Error('Invalid entry media path');
    // Cheap after the first call in a session — getUserFamilyIds is cached.
    const familyIds = await getUserFamilyIds();

    let resolvedFamilyId: string;
    if (knownFamilyId !== undefined) {
      // Fast path: trust the caller's family_id, skip the entries lookup.
      // We still verify the user belongs to that family (defense-in-depth);
      // storage RLS would catch a violation anyway, but a clear app-layer
      // error message is better than a generic 403 from Supabase.
      resolvedFamilyId = knownFamilyId;
    } else {
      // Slow path: original behavior, in case the caller doesn't know.
      const entryId = parts[1];
      const { data, error } = await supabase
        .from('entries')
        .select('family_id')
        .eq('id', entryId)
        .single();
      if (error || !data) {
        throw new Error(`Failed to validate entry media access: ${error?.message ?? 'Entry not found'}`, { cause: error ?? undefined });
      }
      resolvedFamilyId = data.family_id;
    }

    if (!familyIds.includes(resolvedFamilyId)) {
      throw new Error('Access denied — cannot access another family\'s media');
    }

    const signed = await supabase.storage
      .from(ENTRY_MEDIA_BUCKET)
      .createSignedUrl(storagePath, 3600);
    if (signed.error) throw new Error(`Failed to get entry photo URL: ${signed.error.message}`, { cause: signed.error });
    return signed.data.signedUrl;
  },

  /** Delete an entry media object uploaded by the current user. */
  async deleteEntryMedia(storagePath: string) {
    const userId = await getCurrentUserId();
    if (!storagePath.startsWith(`${userId}/`)) {
      throw new Error('Access denied — cannot delete another user\'s media');
    }
    const { error } = await supabase.storage
      .from(ENTRY_MEDIA_BUCKET)
      .remove([storagePath]);
    if (error) throw new Error(`Failed to delete entry media: ${error.message}`, { cause: error });
  },
};
