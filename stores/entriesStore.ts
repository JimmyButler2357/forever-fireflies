// Entries store — local cache of journal entries.
//
// Like the children store, this is a "thin cache" over Supabase.
// The real data lives in the database; this store holds a local
// copy for fast rendering.
//
// The mapper is more complex here because the entries service
// returns "joined" data — entries with their linked children
// and tags nested inside. We need to "flatten" those nested
// objects into simple arrays that our UI components expect.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── UI Shape ────────────────────────────────────────────
// What our React components expect.

export interface Entry {
  id: string;
  text: string;
  date: string; // ISO date string (date only, from entry_date)
  createdAt?: string; // Full ISO timestamp (from created_at)
  childIds: string[];
  tags: string[]; // Tag slugs (e.g. "funny", "milestone")
  isFavorited: boolean;
  hasAudio: boolean;
  audioUri?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  title?: string;
  recordedBy?: string;
  locationText?: string;
  audioDuration?: number; // seconds
  audioStoragePath?: string; // Supabase storage path (e.g. "user123/entry456.wav")
  entryType?: 'voice' | 'text';
}

// ─── Mapper ──────────────────────────────────────────────
// Converts a Supabase timeline row (with nested joins) to
// the flat UI shape our components expect.
//
// The Supabase row has nested objects from joins:
//   entry_children: [{ child_id: "abc" }, ...]
//   entry_tags: [{ tag_id: "xyz", tags: { name: "Funny", slug: "funny" } }, ...]
//
// We "flatten" these into simple arrays:
//   childIds: ["abc", ...]
//   tags: ["funny", ...]
//
// Think of it like unpacking a shipping box — the database
// sends everything wrapped in layers, and the mapper takes
// out just the parts we need.

interface SupabaseTimelineRow {
  id: string;
  transcript: string | null;
  entry_date: string;
  created_at: string;
  is_favorited: boolean;
  is_deleted: boolean;
  deleted_at: string | null;
  audio_storage_path: string | null;
  audio_duration_seconds: number | null;
  location_text: string | null;
  title: string | null;
  user_id: string;
  entry_type: string;
  entry_children: Array<{ child_id: string }>;
  entry_tags: Array<{ tag_id: string; tags: { name: string; slug: string } | null }>;
}

export function mapSupabaseEntry(row: SupabaseTimelineRow): Entry {
  return {
    id: row.id,
    text: row.transcript ?? '',
    date: row.entry_date,
    createdAt: row.created_at,
    childIds: row.entry_children.map((ec) => ec.child_id),
    tags: row.entry_tags
      .map((et) => et.tags?.slug)
      .filter((slug): slug is string => slug != null),
    isFavorited: row.is_favorited,
    hasAudio: row.audio_storage_path != null,
    audioStoragePath: row.audio_storage_path ?? undefined,
    isDeleted: row.is_deleted,
    deletedAt: row.deleted_at ?? undefined,
    locationText: row.location_text ?? undefined,
    title: row.title ?? undefined,
    recordedBy: row.user_id,
    audioDuration: row.audio_duration_seconds ?? undefined,
    entryType: row.entry_type as 'voice' | 'text',
  };
}

// ─── Store ───────────────────────────────────────────────

interface EntriesState {
  entries: Entry[];

  /** Replace all entries (used after fetching timeline from Supabase). */
  setEntries: (entries: Entry[]) => void;

  /** Append more entries (used for pagination — loading older entries). */
  appendEntries: (entries: Entry[]) => void;

  /** Add a single entry to the front (used after creating a new one). */
  addEntryLocal: (entry: Entry) => void;

  /** Update an entry in the local cache. */
  updateEntryLocal: (id: string, updates: Partial<Omit<Entry, 'id'>>) => void;

  /** Remove an entry from the local cache entirely. */
  removeEntryLocal: (id: string) => void;

  /** Clear all entries (used on sign-out). */
  clearEntries: () => void;

  // Legacy methods — used by screens not yet migrated.
  addEntry: (entry: Omit<Entry, 'id'>) => void;
  deleteEntry: (id: string) => void;
  restoreEntry: (id: string) => void;
  permanentlyDeleteEntry: (id: string) => void;
  toggleFavorite: (id: string) => void;
  updateEntry: (id: string, updates: Partial<Omit<Entry, 'id'>>) => void;
}

function uid(): string {
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useEntriesStore = create<EntriesState>()(
  persist(
    (set) => ({
      entries: [],

      // --- New Supabase-aware methods ---

      setEntries: (entries) => set({ entries }),

      appendEntries: (newEntries) =>
        set((state) => ({
          entries: [...state.entries, ...newEntries],
        })),

      addEntryLocal: (entry) =>
        set((state) => ({
          entries: [entry, ...state.entries],
        })),

      updateEntryLocal: (id, updates) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates } : e,
          ),
        })),

      removeEntryLocal: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      clearEntries: () => set({ entries: [] }),

      // --- Legacy methods (kept for unmigrated screens) ---

      addEntry: (entry) =>
        set((state) => ({
          entries: [{ ...entry, id: uid() }, ...state.entries],
        })),

      deleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id
              ? { ...e, isDeleted: true, deletedAt: new Date().toISOString() }
              : e,
          ),
        })),

      restoreEntry: (id) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, isDeleted: false, deletedAt: undefined } : e,
          ),
        })),

      permanentlyDeleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      toggleFavorite: (id) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, isFavorited: !e.isFavorited } : e,
          ),
        })),

      updateEntry: (id, updates) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates } : e,
          ),
        })),
    }),
    {
      name: 'entries-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
