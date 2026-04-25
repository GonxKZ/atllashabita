/* eslint-disable no-undef -- localStorage es global del navegador, gestionado por Zustand persist. */
/**
 * Store Zustand para el comparador territorial.
 *
 * Gestiona la lista de municipios añadidos al banco de comparación con un
 * tope de cuatro entradas (límite visual de la tabla y del radial). Persiste
 * en `localStorage` con la clave `atlashabita.compare.v1` para que el
 * conjunto sobreviva a recargas y el usuario pueda seguir su análisis.
 *
 * Decisiones de diseño:
 *   - Sólo se almacena el ID del municipio: los datos completos los resuelve
 *     la página desde `NATIONAL_MUNICIPALITIES` para que un cambio en el
 *     dataset (renames, refresh) no rompa la persistencia.
 *   - Las acciones son idempotentes: añadir un ID ya presente es no-op.
 *   - `reorder` permite a la UI reordenar columnas con drag & drop sin
 *     duplicar elementos.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Tope de columnas que la tabla y el radial pueden representar. */
export const MAX_COMPARE_ITEMS = 4;

export interface CompareState {
  readonly territoryIds: readonly string[];
}

export interface CompareActions {
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  reorder: (from: number, to: number) => void;
}

export type CompareStore = CompareState & CompareActions;

const INITIAL_STATE: CompareState = {
  territoryIds: [],
};

/**
 * Inserta `id` al final de la lista respetando el tope y evitando duplicados.
 * Definida fuera del store para que los tests puedan apoyarse en ella sin
 * instanciar el provider.
 */
export function appendUnique(
  current: readonly string[],
  id: string,
  cap: number = MAX_COMPARE_ITEMS
): readonly string[] {
  if (current.includes(id)) return current;
  if (current.length >= cap) return current;
  return [...current, id];
}

/**
 * Mueve el elemento de la posición `from` a `to` produciendo un nuevo array
 * inmutable. Cuando los índices son inválidos devuelve el array original.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): readonly T[] {
  if (from === to) return items;
  if (from < 0 || from >= items.length) return items;
  if (to < 0 || to >= items.length) return items;
  const next = items.slice();
  const [picked] = next.splice(from, 1);
  if (picked === undefined) return items;
  next.splice(to, 0, picked);
  return next;
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      add: (id) => set((state) => ({ territoryIds: appendUnique(state.territoryIds, id) })),
      remove: (id) =>
        set((state) => ({
          territoryIds: state.territoryIds.filter((current) => current !== id),
        })),
      toggle: (id) =>
        set((state) => {
          if (state.territoryIds.includes(id)) {
            return { territoryIds: state.territoryIds.filter((current) => current !== id) };
          }
          return { territoryIds: appendUnique(state.territoryIds, id) };
        }),
      clear: () => set({ territoryIds: [] }),
      reorder: (from, to) =>
        set((state) => ({ territoryIds: moveItem(state.territoryIds, from, to) })),
    }),
    {
      name: 'atlashabita.compare.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): CompareState => ({
        territoryIds: state.territoryIds,
      }),
    }
  )
);
