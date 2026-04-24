/**
 * Store Zustand para selección de territorios en UI.
 *
 * Estado efímero: no persiste porque representa la sesión activa
 * (territorio enfocado y comparación activa).
 */

import { create } from 'zustand';

/**
 * La UI actual admite comparar hasta cuatro territorios (RF-007).
 * Se expone como constante para que los componentes lo usen al validar.
 */
export const MAX_COMPARISON_ITEMS = 4;

export interface SelectionState {
  readonly selectedTerritoryId: string | null;
  readonly comparison: readonly string[];
}

export interface SelectionActions {
  selectTerritory: (id: string | null) => void;
  toggleComparison: (id: string) => void;
  addToComparison: (id: string) => void;
  removeFromComparison: (id: string) => void;
  clearComparison: () => void;
}

export type SelectionStore = SelectionState & SelectionActions;

const INITIAL_STATE: SelectionState = {
  selectedTerritoryId: null,
  comparison: [],
};

export const useSelectionStore = create<SelectionStore>((set) => ({
  ...INITIAL_STATE,
  selectTerritory: (id) => set({ selectedTerritoryId: id }),
  toggleComparison: (id) =>
    set((state) => {
      if (state.comparison.includes(id)) {
        return { comparison: state.comparison.filter((current) => current !== id) };
      }
      if (state.comparison.length >= MAX_COMPARISON_ITEMS) {
        return state;
      }
      return { comparison: [...state.comparison, id] };
    }),
  addToComparison: (id) =>
    set((state) => {
      if (state.comparison.includes(id) || state.comparison.length >= MAX_COMPARISON_ITEMS) {
        return state;
      }
      return { comparison: [...state.comparison, id] };
    }),
  removeFromComparison: (id) =>
    set((state) => ({ comparison: state.comparison.filter((current) => current !== id) })),
  clearComparison: () => set({ comparison: [] }),
}));
