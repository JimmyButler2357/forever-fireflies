// Entries service — the heart of the app. Handles creating, reading,
// updating, and searching journal entries. This is the service that
// powers the home timeline, Firefly Jar, and search screens.

import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';
import { capture } from '@/lib/posthog';

type Entry = Database['public']['Tables']['entries']['Row'];
type EntryInsert = Database['public']['Tables']['entries']['Insert'];
type EntryUpdate = Database['public']['Tables']['entries']['Update'];

export const entriesService = {
  /** Fetch timeline entries for the user's family, newest first */
  async getTimeline(familyId: string, page = 0, pageSize = 20) {
    const { data, error } = await supabase
      .from('entries')
      .select('*, entry_children(child_id), entry_tags(tag_id, tags(name, slug)), entry_media(id, storage_path, display_order, media_type)')
      .eq('family_id', familyId)
      .eq('is_deleted', false)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(`Failed to fetch timeline: ${error.message}`, { cause: error });
    return data;
  },

  /** Get a single entry by ID (excludes soft-deleted entries) */
  async getEntry(entryId: string) {
    const { data, error } = await supabase
      .from('entries')
      .select('*, entry_children(child_id, auto_detected), entry_tags(tag_id, tags(name, slug)), entry_media(id, storage_path, display_order, media_type)')
      .eq('id', entryId)
      .eq('is_deleted', false)
      .single();

    if (error) throw new Error(`Failed to fetch entry: ${error.message}`, { cause: error });
    return data;
  },

  /** Create a new entry.
   *  Derives user_id from the authenticated session instead of trusting
   *  the caller. The caller provides family_id and content fields only. */
  async create(entry: Omit<EntryInsert, 'user_id'>) {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated — cannot create entry');

    const { data, error } = await supabase
      .from('entries')
      .insert({ ...entry, user_id: session.user.id })
      .select()
      .single();

    if (error) throw new Error(`Failed to create entry: ${error.message}`, { cause: error });
    capture('entry_created', { type: data.entry_type, hasAudio: !!data.audio_storage_path, hour: new Date().getHours() });
    return data;
  },

  /** Update an entry (transcript, date, location, etc.) */
  async update(entryId: string, updates: EntryUpdate) {
    const { data, error } = await supabase
      .from('entries')
      .update(updates)
      .eq('id', entryId)
      .select()
      .single();

    if (error) throw new Error(`Failed to update entry: ${error.message}`, { cause: error });
    return data;
  },

  /** Toggle favorite (Firefly) status.
   *  Uses an RPC function so family members can star each other's entries
   *  without having broad UPDATE access to all columns.
   *  Returns the new is_favorited value, or null if the entry wasn't found. */
  async toggleFavorite(entryId: string): Promise<boolean | null> {
    const { data, error } = await supabase.rpc('toggle_entry_favorite', {
      target_entry_id: entryId,
    });

    if (error) throw new Error(`Failed to toggle favorite: ${error.message}`, { cause: error });
    return data;
  },

  /** Soft-delete an entry (30-day recovery window) */
  async softDelete(entryId: string) {
    const { error } = await supabase
      .from('entries')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', entryId);

    if (error) throw new Error(`Failed to soft-delete entry: ${error.message}`, { cause: error });
  },

  /** Restore a soft-deleted entry */
  async restore(entryId: string) {
    const { error } = await supabase
      .from('entries')
      .update({ is_deleted: false, deleted_at: null })
      .eq('id', entryId);

    if (error) throw new Error(`Failed to restore entry: ${error.message}`, { cause: error });
  },

  /** Permanently delete an entry (only works on entries soft-deleted 30+ days ago) */
  async hardDelete(entryId: string) {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', entryId);

    if (error) throw new Error(`Failed to hard-delete entry: ${error.message}`, { cause: error });
  },

  /** Get soft-deleted entries (for Recently Deleted in Settings) */
  async getDeleted(familyId: string, page = 0, pageSize = 20) {
    const { data, error } = await supabase
      .from('entries')
      .select('*, entry_children(child_id), entry_tags(tag_id, tags(name, slug)), entry_media(id, storage_path, display_order, media_type)')
      .eq('family_id', familyId)
      .eq('is_deleted', true)
      .order('deleted_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(`Failed to fetch deleted entries: ${error.message}`, { cause: error });
    return data;
  },

  /** Get favorited entries (Firefly Jar screen) */
  async getFavorites(familyId: string, page = 0, pageSize = 20) {
    const { data, error } = await supabase
      .from('entries')
      .select('*, entry_children(child_id), entry_tags(tag_id, tags(name, slug)), entry_media(id, storage_path, display_order, media_type)')
      .eq('family_id', familyId)
      .eq('is_deleted', false)
      .eq('is_favorited', true)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(`Failed to fetch favorites: ${error.message}`, { cause: error });
    return data;
  },

  /** Full-text search on transcripts */
  async search(familyId: string, query: string, page = 0, pageSize = 20) {
    const { data, error } = await supabase
      .from('entries')
      .select('*, entry_children(child_id), entry_tags(tag_id, tags(name, slug)), entry_media(id, storage_path, display_order, media_type)')
      .eq('family_id', familyId)
      .eq('is_deleted', false)
      .textSearch('transcript', query, { type: 'websearch', config: 'english' })
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (error) throw new Error(`Failed to search entries: ${error.message}`, { cause: error });
    return data;
  },

  /** Link children to an entry (replaces existing links).
   *  Uses an RPC function so the delete + insert happens in a single
   *  database transaction — if the insert fails, the delete is rolled back
   *  and the old links are preserved. No silent data loss. */
  async setEntryChildren(entryId: string, childIds: string[], autoDetected = false) {
    const { error } = await supabase.rpc('set_entry_children', {
      target_entry_id: entryId,
      child_ids: childIds,
      is_auto_detected: autoDetected,
    });

    if (error) throw new Error(`Failed to set entry children: ${error.message}`, { cause: error });
  },

  /** Link tags to an entry (replaces existing links).
   *  Uses an RPC function so the delete + insert happens in a single
   *  database transaction — atomic, all-or-nothing. */
  async setEntryTags(entryId: string, tagIds: string[], autoApplied = false) {
    const { error } = await supabase.rpc('set_entry_tags', {
      target_entry_id: entryId,
      tag_ids: tagIds,
      is_auto_applied: autoApplied,
    });

    if (error) throw new Error(`Failed to set entry tags: ${error.message}`, { cause: error });
  },

  /** Refresh only auto-detected child links for an entry.
   *  Deletes all rows where auto_detected = true, then inserts new ones.
   *  Manual rows (auto_detected = false) are left untouched.
   *  If a new auto child collides with an existing manual row, the manual
   *  row wins (ON CONFLICT DO NOTHING — no duplicate). */
  async refreshAutoChildren(entryId: string, childIds: string[]) {
    const { error } = await supabase.rpc('refresh_auto_children', {
      target_entry_id: entryId,
      child_ids: childIds,
    });

    if (error) throw new Error(`Failed to refresh auto-detected children: ${error.message}`, { cause: error });
  },

  /** Refresh only auto-applied tag links for an entry.
   *  Same pattern as refreshAutoChildren but for tags.
   *  Manual tags (auto_applied = false) are preserved. */
  async refreshAutoTags(entryId: string, tagIds: string[]) {
    const { error } = await supabase.rpc('refresh_auto_tags', {
      target_entry_id: entryId,
      tag_ids: tagIds,
    });

    if (error) throw new Error(`Failed to refresh auto-applied tags: ${error.message}`, { cause: error });
  },

  /** Trigger AI processing for an entry (title, transcript cleanup, smart tags).
   *  Calls the process-entry Edge Function. This is non-critical — if it
   *  fails, the entry still has its raw transcript and keyword-detected tags.
   *
   *  Think of it like sending your journal to a helpful assistant who adds
   *  a nice title, tidies up the "um"s, and sticks the right labels on it. */
  async processWithAI(entryId: string): Promise<{ title?: string; cleaned_transcript?: string; tags_applied?: number } | null> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated — cannot process entry');

    const start = Date.now();
    const { data, error } = await supabase.functions.invoke('process-entry', {
      body: { entry_id: entryId },
    });
    const durationMs = Date.now() - start;

    if (error) {
      // FunctionsHttpError hides the real response body in error.context.
      // Try to read it so we can see the actual edge function error.
      const ctx = (error as any).context;
      if (ctx && typeof ctx.text === 'function') {
        ctx.text().then((body: string) => console.warn('AI processing error body:', body)).catch(() => {});
      }
      capture('ai_processing_completed', { durationMs, success: false });
      console.warn('AI processing failed:', error.message ?? error);
      return null;
    }

    if (data?.success === false) {
      capture('ai_processing_completed', { durationMs, success: false });
      console.warn('AI processing returned success: false:', data);
      return null;
    }

    capture('ai_processing_completed', { durationMs, success: true });
    return data;
  },

  /** Add one photo attachment row for an entry. */
  async addEntryPhoto(
    entryId: string,
    photo: {
      storage_path: string;
      display_order: number;
      width?: number | null;
      height?: number | null;
      file_size_bytes?: number | null;
    },
  ) {
    const entryQuery = await supabase
      .from('entries')
      .select('family_id, user_id')
      .eq('id', entryId)
      .single();

    if (entryQuery.error || !entryQuery.data) {
      throw new Error(`Failed to resolve entry owner: ${entryQuery.error?.message ?? 'Entry not found'}`, { cause: entryQuery.error ?? undefined });
    }

    const insertQuery = await supabase
      .from('entry_media' as any)
      .insert({
        entry_id: entryId,
        family_id: entryQuery.data.family_id,
        user_id: entryQuery.data.user_id,
        media_type: 'photo',
        storage_path: photo.storage_path,
        display_order: photo.display_order,
        width: photo.width ?? null,
        height: photo.height ?? null,
        file_size_bytes: photo.file_size_bytes ?? null,
      })
      .select('*')
      .single();

    if (insertQuery.error) {
      throw new Error(`Failed to add entry photo: ${insertQuery.error.message}`, { cause: insertQuery.error });
    }
    return insertQuery.data as { id: string; storage_path: string; display_order: number };
  },

  /** Remove one photo attachment row from an entry. */
  async removeEntryPhoto(photoId: string) {
    const query = await supabase
      .from('entry_media' as any)
      .delete()
      .eq('id', photoId);
    if (query.error) {
      throw new Error(`Failed to remove entry photo: ${query.error.message}`, { cause: query.error });
    }
  },
};
