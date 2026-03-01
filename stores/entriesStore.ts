import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Entry {
  id: string;
  text: string;
  date: string; // ISO date string
  childIds: string[];
  tags: string[];
  isFavorited: boolean;
  hasAudio: boolean;
  audioUri?: string;
  isDeleted?: boolean;
  deletedAt?: string;
  // Future-proofing fields — added now to avoid schema rework later
  title?: string; // AI-generated title (V1.5)
  recordedBy?: string; // User ID of recording parent (V2 — parent merge)
  locationText?: string; // Readable location label, e.g. "Tampa, FL" (V1.0 capture, V2 search)
}

interface EntriesState {
  entries: Entry[];
  addEntry: (entry: Omit<Entry, 'id'>) => void;
  deleteEntry: (id: string) => void;
  restoreEntry: (id: string) => void;
  permanentlyDeleteEntry: (id: string) => void;
  toggleFavorite: (id: string) => void;
  updateEntry: (id: string, updates: Partial<Omit<Entry, 'id'>>) => void;
}

/** Generate a unique ID that survives app reloads (timestamp + random) */
function uid(): string {
  return `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useEntriesStore = create<EntriesState>()(
  persist(
    (set) => ({
      entries: [],
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
