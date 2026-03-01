import { create } from 'zustand';

interface UIState {
  activeChildFilter: string | null; // null means "All"
  setActiveChildFilter: (childId: string | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activeChildFilter: null,
  setActiveChildFilter: (childId) => set({ activeChildFilter: childId }),
}));
