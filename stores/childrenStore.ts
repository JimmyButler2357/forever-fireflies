// Children store — local cache of child profiles.
//
// This store is a "thin cache" — it holds children data for fast
// UI rendering, but the real source of truth is Supabase.
//
// The flow:
// 1. Write to Supabase first (via childrenService)
// 2. Get the server response back (with real UUIDs, timestamps, etc.)
// 3. Convert snake_case → camelCase with the mapper
// 4. Update this store with the mapped data
//
// Think of it like a notepad next to a filing cabinet. The filing
// cabinet (Supabase) is the real record. The notepad (this store)
// is a quick-reference copy so you don't have to open the cabinet
// every time you want to glance at a name.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Database } from '@/lib/database.types';
import { childColors } from '@/constants/theme';

// The Supabase row type — what the database sends us.
// Uses snake_case because that's the database convention.
type SupabaseChild = Database['public']['Tables']['children']['Row'];

// The UI shape — what our React components expect.
// Uses camelCase because that's the JavaScript convention.
export interface Child {
  id: string;
  name: string;
  birthday: string; // ISO date string
  nickname?: string;
  colorIndex: number;
}

// ─── Mapper ──────────────────────────────────────────────
// Converts a Supabase row (snake_case) to a UI object (camelCase).
// This is the "interpreter" between database-speak and UI-speak.
//
// Example:
//   { color_index: 2, ... } → { colorIndex: 2, ... }

export function mapSupabaseChild(row: SupabaseChild): Child {
  return {
    id: row.id,
    name: row.name,
    birthday: row.birthday,
    nickname: row.nickname ?? undefined,
    colorIndex: row.color_index,
  };
}

// ─── Store ───────────────────────────────────────────────

interface ChildrenState {
  children: Child[];

  /** Replace all children at once (used after fetching from Supabase). */
  setChildren: (children: Child[]) => void;

  /** Add a single child to the local cache (used after creating in Supabase). */
  addChildLocal: (child: Child) => void;

  /** Remove a child from the local cache (used after deleting in Supabase). */
  removeChildLocal: (id: string) => void;

  /** Update a child in the local cache (used after updating in Supabase). */
  updateChildLocal: (id: string, updates: Partial<Omit<Child, 'id'>>) => void;

  /** Clear all children (used on sign-out). */
  clearChildren: () => void;

  // Legacy aliases — used by screens not yet migrated to Supabase.
  // These will be removed once settings.tsx and home.tsx are updated.
  addChild: (child: Omit<Child, 'id' | 'colorIndex'> & { colorIndex?: number }) => void;
  removeChild: (id: string) => void;
  updateChild: (id: string, updates: Partial<Omit<Child, 'id'>>) => void;
}

export const useChildrenStore = create<ChildrenState>()(
  persist(
    (set) => ({
      children: [],

      setChildren: (children) => set({ children }),

      addChildLocal: (child) =>
        set((state) => ({
          children: [...state.children, child],
        })),

      removeChildLocal: (id) =>
        set((state) => ({
          children: state.children.filter((c) => c.id !== id),
        })),

      updateChildLocal: (id, updates) =>
        set((state) => ({
          children: state.children.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        })),

      clearChildren: () => set({ children: [] }),

      // Legacy aliases — keep old screens working until they're migrated.
      addChild: (child) =>
        set((state) => ({
          children: [
            ...state.children,
            {
              ...child,
              id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              colorIndex: child.colorIndex ?? state.children.length % childColors.length,
            },
          ],
        })),
      removeChild: (id) =>
        set((state) => ({
          children: state.children.filter((c) => c.id !== id),
        })),
      updateChild: (id, updates) =>
        set((state) => ({
          children: state.children.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        })),
    }),
    {
      name: 'children-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
