/* eslint-disable no-undef -- localStorage es global del navegador. */
import { beforeEach, describe, expect, it } from 'vitest';
import { hashWeightOverrides, useFiltersStore } from '../filters';

describe('useFiltersStore', () => {
  beforeEach(() => {
    useFiltersStore.getState().resetFilters();
    localStorage.clear();
  });

  it('tiene estado inicial compatible con la API sin overrides', () => {
    const state = useFiltersStore.getState();
    expect(state.activeProfile).toBe('remote_work');
    expect(state.scope).toBe('es');
    expect(state.weightOverrides).toEqual({});
    expect(state.activeLayers).toEqual(['score']);
    expect(state.hardFilters).toEqual([]);
  });

  it('actualiza perfil activo', () => {
    useFiltersStore.getState().setActiveProfile('family');
    expect(useFiltersStore.getState().activeProfile).toBe('family');
  });

  it('aplica y limpia overrides de pesos', () => {
    useFiltersStore.getState().setWeightOverride('rent', 0.4);
    useFiltersStore.getState().setWeightOverride('services', 0.3);
    expect(useFiltersStore.getState().weightOverrides).toEqual({ rent: 0.4, services: 0.3 });
    useFiltersStore.getState().clearWeightOverrides();
    expect(useFiltersStore.getState().weightOverrides).toEqual({});
  });

  it('alterna capas activas sin duplicar', () => {
    const store = useFiltersStore.getState();
    store.toggleLayer('rent');
    expect(useFiltersStore.getState().activeLayers).toContain('rent');
    useFiltersStore.getState().toggleLayer('rent');
    expect(useFiltersStore.getState().activeLayers).not.toContain('rent');
  });

  it('guarda filtros duros inmutables', () => {
    const filters = [{ factor: 'rent', operator: 'lte', value: 12 } as const];
    useFiltersStore.getState().setHardFilters(filters);
    expect(useFiltersStore.getState().hardFilters).toEqual(filters);
  });
});

describe('hashWeightOverrides', () => {
  it('devuelve default cuando no hay overrides', () => {
    expect(hashWeightOverrides({})).toBe('default');
  });
  it('es estable respecto al orden de inserción', () => {
    const a = hashWeightOverrides({ rent: 0.5, services: 0.3 });
    const b = hashWeightOverrides({ services: 0.3, rent: 0.5 });
    expect(a).toBe(b);
  });
  it('cambia cuando cambian los pesos', () => {
    const base = hashWeightOverrides({ rent: 0.5 });
    const alt = hashWeightOverrides({ rent: 0.6 });
    expect(base).not.toBe(alt);
  });
});
