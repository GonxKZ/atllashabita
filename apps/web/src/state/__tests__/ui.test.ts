import { beforeEach, describe, expect, it } from 'vitest';
import { useUiStore } from '../ui';

describe('useUiStore', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
  });

  it('inicialmente el ranking no está pinchado y la leyenda y minimap están abiertos', () => {
    const state = useUiStore.getState();
    expect(state.isRankingPinned).toBe(false);
    expect(state.legendOpen).toBe(true);
    expect(state.miniMapOpen).toBe(true);
    expect(state.selectedTerritoryId).toBeNull();
  });

  it('togglea el pin del ranking sin afectar otros flags', () => {
    useUiStore.getState().toggleRankingPinned();
    expect(useUiStore.getState().isRankingPinned).toBe(true);
    useUiStore.getState().toggleRankingPinned();
    expect(useUiStore.getState().isRankingPinned).toBe(false);
  });

  it('abre y cierra la ficha territorial', () => {
    useUiStore.getState().openTerritorySheet('mun:41091');
    expect(useUiStore.getState().selectedTerritoryId).toBe('mun:41091');
    useUiStore.getState().closeTerritorySheet();
    expect(useUiStore.getState().selectedTerritoryId).toBeNull();
  });

  it('toggleLegend invierte la visibilidad', () => {
    useUiStore.getState().toggleLegend();
    expect(useUiStore.getState().legendOpen).toBe(false);
    useUiStore.getState().toggleLegend();
    expect(useUiStore.getState().legendOpen).toBe(true);
  });

  it('toggleMiniMap invierte la visibilidad', () => {
    useUiStore.getState().toggleMiniMap();
    expect(useUiStore.getState().miniMapOpen).toBe(false);
    useUiStore.getState().toggleMiniMap();
    expect(useUiStore.getState().miniMapOpen).toBe(true);
  });

  it('reset restablece el estado inicial', () => {
    const store = useUiStore.getState();
    store.toggleRankingPinned();
    store.openTerritorySheet('mun:28079');
    store.toggleLegend();
    store.toggleMiniMap();
    store.reset();
    const state = useUiStore.getState();
    expect(state.isRankingPinned).toBe(false);
    expect(state.legendOpen).toBe(true);
    expect(state.miniMapOpen).toBe(true);
    expect(state.selectedTerritoryId).toBeNull();
  });
});
