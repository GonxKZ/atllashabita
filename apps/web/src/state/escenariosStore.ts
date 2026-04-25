/* eslint-disable no-undef -- localStorage es global del navegador, gestionado por Zustand persist. */
/**
 * Store Zustand del simulador de escenarios.
 *
 * Modela un conjunto de pesos por factor (suman 1.0) y permite guardar
 * combinaciones nombradas para comparar el ranking resultante antes/después
 * de ajustar la prioridad de cada criterio.
 *
 * Persistencia:
 *   - Clave `atlashabita.escenarios.v1` en `localStorage`.
 *   - Los pesos activos se guardan tal cual; los escenarios nombrados se
 *     versionan con un timestamp para mostrar en la UI cuándo se grabaron.
 *
 * El cálculo del ranking lo hace la página, no el store, para mantener este
 * módulo libre de dependencias de datos y testeable de forma aislada.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

/** Identificador opaco de un factor de scoring (rent_price, broadband, ...). */
export type WeightKey = string;

/** Diccionario peso por factor. Los valores deberían sumar ~1.0 (100%). */
export type WeightVector = Readonly<Record<WeightKey, number>>;

/** Escenario guardado por el usuario. */
export interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly weights: WeightVector;
}

export interface EscenariosState {
  readonly weights: WeightVector;
  readonly baseline: WeightVector;
  readonly scenarios: readonly Scenario[];
}

export interface EscenariosActions {
  setWeight: (key: WeightKey, value: number) => void;
  setWeights: (weights: WeightVector) => void;
  resetToBaseline: () => void;
  saveScenario: (name: string) => string;
  loadScenario: (id: string) => boolean;
  deleteScenario: (id: string) => void;
}

export type EscenariosStore = EscenariosState & EscenariosActions;

/**
 * Pesos por defecto inspirados en el perfil "explorer" del backend.
 * Suman 1.00. Pensado para que los sliders arranquen en una distribución
 * coherente sin tener que llamar a la API.
 */
export const DEFAULT_WEIGHTS: WeightVector = Object.freeze({
  rent_price: 0.2,
  income: 0.15,
  broadband: 0.15,
  services: 0.15,
  air_quality: 0.1,
  mobility: 0.1,
  transit: 0.1,
  climate: 0.05,
});

const INITIAL_STATE: EscenariosState = {
  weights: { ...DEFAULT_WEIGHTS },
  baseline: { ...DEFAULT_WEIGHTS },
  scenarios: [],
};

/**
 * Normaliza un vector de pesos para que sume `target` (1.0 por defecto).
 * Si la suma es cero (todos los sliders al mínimo) reparte el target a
 * partes iguales para evitar divisiones por cero en el ranking.
 */
export function normalizeWeights(input: WeightVector, target: number = 1): WeightVector {
  const entries = Object.entries(input);
  if (entries.length === 0) return {};
  // Clampamos primero los valores negativos a 0 para que la suma represente
  // sólo la masa real del vector (los pesos negativos no tienen sentido).
  const clamped = entries.map(([key, value]) => {
    const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
    return [key, safe] as const;
  });
  const total = clamped.reduce((acc, [, value]) => acc + value, 0);
  if (total === 0) {
    const equal = target / entries.length;
    return Object.fromEntries(entries.map(([key]) => [key, equal]));
  }
  const factor = target / total;
  return Object.fromEntries(clamped.map(([key, value]) => [key, value * factor]));
}

/** Suma simple de un vector (para mostrar el porcentaje real en la UI). */
export function sumWeights(weights: WeightVector): number {
  return Object.values(weights).reduce(
    (acc, value) => acc + (Number.isFinite(value) ? value : 0),
    0
  );
}

/**
 * Genera un identificador único para escenarios usando el reloj y un sufijo
 * aleatorio corto. Aislado en una función para que los tests puedan
 * mockearlo si necesitan ids deterministas.
 */
function generateScenarioId(): string {
  const stamp = Date.now().toString(36);
  const noise = Math.random().toString(36).slice(2, 8);
  return `scenario_${stamp}_${noise}`;
}

export const useEscenariosStore = create<EscenariosStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,
      setWeight: (key, value) =>
        set((state) => ({
          weights: { ...state.weights, [key]: Math.max(0, Math.min(1, value)) },
        })),
      setWeights: (weights) => set({ weights: { ...weights } }),
      resetToBaseline: () => set((state) => ({ weights: { ...state.baseline } })),
      saveScenario: (name) => {
        const trimmed = name.trim();
        const safeName = trimmed.length > 0 ? trimmed : 'Escenario sin título';
        const id = generateScenarioId();
        const scenario: Scenario = {
          id,
          name: safeName,
          createdAt: Date.now(),
          weights: { ...get().weights },
        };
        set((state) => ({ scenarios: [...state.scenarios, scenario] }));
        return id;
      },
      loadScenario: (id) => {
        const found = get().scenarios.find((scenario) => scenario.id === id);
        if (!found) return false;
        set({ weights: { ...found.weights } });
        return true;
      },
      deleteScenario: (id) =>
        set((state) => ({ scenarios: state.scenarios.filter((scenario) => scenario.id !== id) })),
    }),
    {
      name: 'atlashabita.escenarios.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state): EscenariosState => ({
        weights: state.weights,
        baseline: state.baseline,
        scenarios: state.scenarios,
      }),
    }
  )
);
