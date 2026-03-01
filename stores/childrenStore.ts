import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Child {
  id: string;
  name: string;
  birthday: string; // ISO date string
  nickname?: string;
  colorIndex: number;
}

interface ChildrenState {
  children: Child[];
  addChild: (child: Omit<Child, 'id' | 'colorIndex'> & { colorIndex?: number }) => void;
  removeChild: (id: string) => void;
  updateChild: (id: string, updates: Partial<Omit<Child, 'id'>>) => void;
}

/** Generate a unique ID that survives app reloads (timestamp + random) */
function uid(): string {
  return `c_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useChildrenStore = create<ChildrenState>()(
  persist(
    (set, get) => ({
      children: [],
      addChild: (child) =>
        set((state) => ({
          children: [
            ...state.children,
            {
              ...child,
              id: uid(),
              colorIndex: child.colorIndex ?? state.children.length % 6,
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
