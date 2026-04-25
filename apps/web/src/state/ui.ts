/**
 * Store Zustand para la UI del Atelier (overlays cartográficos del milestone
 * M12 — issue #118).
 *
 * Centraliza el estado efímero que coordina los overlays sobre el mapa
 * fullscreen del shell:
 *
 *  - `isRankingPinned`: controla si el ranking flotante permanece anclado
 *    (no autocollapsa a 56 px tras 6 s sin foco).
 *  - `selectedTerritoryId`: identificador del municipio cuya ficha
 *    `TerritorySheet` está visible. Vive aquí (en lugar de reutilizar
 *    `selection.ts`) porque la selección del bottom-sheet es un concepto
 *    de UI puramente derivado y queremos evitar acoplamientos con la
 *    lógica de comparación.
 *  - `legendOpen`: visibilidad de la leyenda flotante rica
 *    (`RichLegend`). Permite ocultarla con `]` cuando estorba.
 *  - `miniMapOpen`: visibilidad del minimap. El usuario puede plegarlo
 *    para liberar la esquina inferior derecha.
 *
 * Diseño:
 *  - Estado efímero (no persistido): los overlays son "modales suaves"
 *    con expectativa de pertenecer a la sesión activa.
 *  - API minimalista basada en setters predecibles para que los tests y
 *    los componentes consumidores puedan mockear el store sin dolor.
 *  - Cumple SRP: cada acción cambia un único campo o describe una
 *    transición coherente (`openTerritorySheet`, `closeTerritorySheet`).
 */

import { create } from 'zustand';

export interface UiState {
  /** Si `true`, el ranking permanece desplegado y no autocollapsa. */
  readonly isRankingPinned: boolean;
  /** Territorio cuya ficha (TerritorySheet) está abierta. */
  readonly selectedTerritoryId: string | null;
  /** Visibilidad de la leyenda rica flotante. */
  readonly legendOpen: boolean;
  /** Visibilidad del minimap inferior derecho. */
  readonly miniMapOpen: boolean;
}

export interface UiActions {
  /** Marca/desmarca el ranking como anclado. */
  setRankingPinned: (pinned: boolean) => void;
  /** Atajo: invierte el estado del pin. */
  toggleRankingPinned: () => void;
  /** Abre la ficha territorial sobre `id`. */
  openTerritorySheet: (id: string) => void;
  /** Cierra la ficha territorial actual. */
  closeTerritorySheet: () => void;
  /** Visibilidad explícita de la leyenda. */
  setLegendOpen: (open: boolean) => void;
  /** Atajo: invierte la visibilidad de la leyenda. */
  toggleLegend: () => void;
  /** Visibilidad explícita del minimap. */
  setMiniMapOpen: (open: boolean) => void;
  /** Atajo: invierte la visibilidad del minimap. */
  toggleMiniMap: () => void;
  /** Restaura todos los flags a su valor inicial. */
  reset: () => void;
}

export type UiStore = UiState & UiActions;

const INITIAL_STATE: UiState = {
  isRankingPinned: false,
  selectedTerritoryId: null,
  legendOpen: true,
  miniMapOpen: true,
};

export const useUiStore = create<UiStore>((set) => ({
  ...INITIAL_STATE,
  setRankingPinned: (pinned) => set({ isRankingPinned: pinned }),
  toggleRankingPinned: () => set((state) => ({ isRankingPinned: !state.isRankingPinned })),
  openTerritorySheet: (id) => set({ selectedTerritoryId: id }),
  closeTerritorySheet: () => set({ selectedTerritoryId: null }),
  setLegendOpen: (open) => set({ legendOpen: open }),
  toggleLegend: () => set((state) => ({ legendOpen: !state.legendOpen })),
  setMiniMapOpen: (open) => set({ miniMapOpen: open }),
  toggleMiniMap: () => set((state) => ({ miniMapOpen: !state.miniMapOpen })),
  reset: () => set({ ...INITIAL_STATE }),
}));

/** Estado inicial exportado para los tests y para resetear desde `beforeEach`. */
export const UI_STORE_INITIAL_STATE = INITIAL_STATE;
