/* eslint-disable no-undef -- localStorage es global del navegador gestionado por Zustand persist. */
/**
 * Store Zustand que controla la capa activa del mapa multi-métrica.
 *
 * El switcher de la home (`DashboardShell`) y el de la página `/mapa` leen y
 * escriben en este store, de modo que la selección se sincroniza al instante
 * sin pasar por la URL ni por el filtro de scoring (`filters.ts`). La capa
 * activa se persiste en `localStorage` para que el usuario reabra la app con
 * la métrica que estaba consultando.
 *
 * El store expone únicamente el ID de la capa, no su definición: los
 * componentes resuelven los metadatos desde el catálogo
 * (`features/map/layers/index.ts`) para que los cambios de paleta o etiqueta
 * no obliguen a invalidar el estado persistido.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Identificador serializable de la capa activa. */
export type ActiveMapLayerId = string;

export interface MapLayerState {
  readonly activeLayerId: ActiveMapLayerId;
}

export interface MapLayerActions {
  setActiveLayer: (layerId: ActiveMapLayerId) => void;
  resetActiveLayer: () => void;
}

const DEFAULT_LAYER_ID: ActiveMapLayerId = 'score';

const INITIAL_STATE: MapLayerState = {
  activeLayerId: DEFAULT_LAYER_ID,
};

export type MapLayerStore = MapLayerState & MapLayerActions;

export const useMapLayerStore = create<MapLayerStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      setActiveLayer: (layerId) => set({ activeLayerId: layerId }),
      resetActiveLayer: () => set({ activeLayerId: DEFAULT_LAYER_ID }),
    }),
    {
      name: 'atlashabita:map-layer',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): MapLayerState => ({
        activeLayerId: state.activeLayerId,
      }),
    }
  )
);

/** Constante exportada para tests y para inicializar consumidores SSR. */
export const DEFAULT_MAP_LAYER_ID = DEFAULT_LAYER_ID;
