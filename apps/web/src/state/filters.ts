/* eslint-disable no-undef -- localStorage es global del navegador gestionado por Zustand persist. */
/**
 * Store Zustand que concentra la configuración de filtrado y scoring.
 *
 * Persiste en `localStorage` para que el usuario recupere su selección tras
 * recargar. Sólo se almacenan datos serializables (IDs, pesos y filtros).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { HardFilter, ProfileId, TerritoryScope } from '../services/types';

/**
 * Sobrescritura parcial de los pesos por perfil.
 *
 * Se representa como diccionario `factor -> weight` para permitir que el
 * usuario mueva sólo los sliders que le interesan sin clonar la lista entera.
 */
export type WeightOverrides = Readonly<Record<string, number>>;

export interface FiltersState {
  readonly activeProfile: ProfileId;
  readonly scope: TerritoryScope;
  readonly weightOverrides: WeightOverrides;
  readonly activeLayers: readonly string[];
  readonly hardFilters: readonly HardFilter[];
}

export interface FiltersActions {
  setActiveProfile: (profile: ProfileId) => void;
  setScope: (scope: TerritoryScope) => void;
  setWeightOverride: (factor: string, weight: number) => void;
  clearWeightOverrides: () => void;
  toggleLayer: (layerId: string) => void;
  setLayers: (layers: readonly string[]) => void;
  setHardFilters: (filters: readonly HardFilter[]) => void;
  resetFilters: () => void;
}

const INITIAL_STATE: FiltersState = {
  activeProfile: 'remote_work',
  scope: 'es',
  weightOverrides: {},
  activeLayers: ['score'],
  hardFilters: [],
};

export type FiltersStore = FiltersState & FiltersActions;

export const useFiltersStore = create<FiltersStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setActiveProfile: (profile) => set({ activeProfile: profile }),
      setScope: (scope) => set({ scope }),
      setWeightOverride: (factor, weight) =>
        set((state) => ({
          weightOverrides: { ...state.weightOverrides, [factor]: weight },
        })),
      clearWeightOverrides: () => set({ weightOverrides: {} }),
      toggleLayer: (layerId) =>
        set((state) => {
          const isActive = state.activeLayers.includes(layerId);
          const next = isActive
            ? state.activeLayers.filter((id) => id !== layerId)
            : [...state.activeLayers, layerId];
          return { activeLayers: next };
        }),
      setLayers: (layers) => set({ activeLayers: [...layers] }),
      setHardFilters: (filters) => set({ hardFilters: [...filters] }),
      resetFilters: () => set({ ...INITIAL_STATE }),
    }),
    {
      name: 'atlashabita:filters',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): FiltersState => ({
        activeProfile: state.activeProfile,
        scope: state.scope,
        weightOverrides: state.weightOverrides,
        activeLayers: state.activeLayers,
        hardFilters: state.hardFilters,
      }),
    }
  )
);

/**
 * Hash estable de los overrides de pesos para clave de caché.
 * Ordena por clave para garantizar idempotencia.
 */
export function hashWeightOverrides(overrides: WeightOverrides): string {
  const entries = Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0) return 'default';
  return entries.map(([k, v]) => `${k}:${v.toFixed(3)}`).join('|');
}
