import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_WEIGHTS,
  normalizeWeights,
  sumWeights,
  useEscenariosStore,
} from '../escenariosStore';

describe('normalizeWeights', () => {
  it('escala el vector para que sume 1.0', () => {
    const result = normalizeWeights({ a: 2, b: 2, c: 6 });
    expect(sumWeights(result)).toBeCloseTo(1, 5);
    expect(result.c).toBeCloseTo(0.6, 5);
  });

  it('reparte equitativamente cuando la suma es 0', () => {
    const result = normalizeWeights({ a: 0, b: 0 });
    expect(result.a).toBeCloseTo(0.5, 5);
    expect(result.b).toBeCloseTo(0.5, 5);
  });

  it('clampa valores negativos a 0', () => {
    const result = normalizeWeights({ a: -1, b: 1 });
    expect(result.a).toBe(0);
    expect(result.b).toBeCloseTo(1, 5);
  });
});

describe('useEscenariosStore', () => {
  beforeEach(() => {
    useEscenariosStore.setState({
      weights: { ...DEFAULT_WEIGHTS },
      baseline: { ...DEFAULT_WEIGHTS },
      scenarios: [],
    });
  });

  it('actualiza el peso de un factor sin afectar al resto', () => {
    const store = useEscenariosStore.getState();
    store.setWeight('rent_price', 0.5);
    const state = useEscenariosStore.getState();
    expect(state.weights.rent_price).toBe(0.5);
    expect(state.weights.income).toBe(DEFAULT_WEIGHTS.income);
  });

  it('clampa el valor entre 0 y 1', () => {
    const store = useEscenariosStore.getState();
    store.setWeight('rent_price', -1);
    expect(useEscenariosStore.getState().weights.rent_price).toBe(0);
    store.setWeight('rent_price', 5);
    expect(useEscenariosStore.getState().weights.rent_price).toBe(1);
  });

  it('guarda y recupera escenarios', () => {
    const store = useEscenariosStore.getState();
    store.setWeight('rent_price', 0.4);
    const id = store.saveScenario('Familiar');
    store.setWeight('rent_price', 0.1);
    const ok = store.loadScenario(id);
    expect(ok).toBe(true);
    expect(useEscenariosStore.getState().weights.rent_price).toBe(0.4);
  });

  it('borra escenarios por id', () => {
    const store = useEscenariosStore.getState();
    const id = store.saveScenario('Estudiante');
    expect(useEscenariosStore.getState().scenarios).toHaveLength(1);
    store.deleteScenario(id);
    expect(useEscenariosStore.getState().scenarios).toHaveLength(0);
  });

  it('resetToBaseline restablece la baseline persistida', () => {
    const store = useEscenariosStore.getState();
    store.setWeight('rent_price', 0.7);
    store.resetToBaseline();
    expect(useEscenariosStore.getState().weights.rent_price).toBe(DEFAULT_WEIGHTS.rent_price);
  });

  it('asigna un nombre por defecto si la cadena está vacía', () => {
    const store = useEscenariosStore.getState();
    store.saveScenario('   ');
    const last = useEscenariosStore.getState().scenarios.at(-1);
    expect(last?.name).toBe('Escenario sin título');
  });
});
