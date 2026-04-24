import { beforeEach, describe, expect, it } from 'vitest';
import { MAX_COMPARISON_ITEMS, useSelectionStore } from '../selection';

describe('useSelectionStore', () => {
  beforeEach(() => {
    useSelectionStore.setState({ selectedTerritoryId: null, comparison: [] });
  });

  it('inicialmente no hay selección ni comparación', () => {
    const state = useSelectionStore.getState();
    expect(state.selectedTerritoryId).toBeNull();
    expect(state.comparison).toEqual([]);
  });

  it('selecciona y deselecciona territorio', () => {
    useSelectionStore.getState().selectTerritory('municipality:41091');
    expect(useSelectionStore.getState().selectedTerritoryId).toBe('municipality:41091');
    useSelectionStore.getState().selectTerritory(null);
    expect(useSelectionStore.getState().selectedTerritoryId).toBeNull();
  });

  it('toggleComparison añade y elimina sin duplicar', () => {
    useSelectionStore.getState().toggleComparison('a');
    useSelectionStore.getState().toggleComparison('b');
    expect(useSelectionStore.getState().comparison).toEqual(['a', 'b']);
    useSelectionStore.getState().toggleComparison('a');
    expect(useSelectionStore.getState().comparison).toEqual(['b']);
  });

  it('no supera el máximo de comparación', () => {
    const store = useSelectionStore.getState();
    for (let i = 0; i < MAX_COMPARISON_ITEMS + 2; i += 1) {
      store.addToComparison(`t${i}`);
    }
    expect(useSelectionStore.getState().comparison).toHaveLength(MAX_COMPARISON_ITEMS);
  });

  it('clearComparison vacía la selección', () => {
    useSelectionStore.getState().addToComparison('a');
    useSelectionStore.getState().addToComparison('b');
    useSelectionStore.getState().clearComparison();
    expect(useSelectionStore.getState().comparison).toEqual([]);
  });
});
