import { beforeEach, describe, expect, it } from 'vitest';
import { appendUnique, MAX_COMPARE_ITEMS, moveItem, useCompareStore } from '../compareStore';

describe('appendUnique', () => {
  it('respeta el cap y evita duplicados', () => {
    expect(appendUnique([], 'a')).toEqual(['a']);
    expect(appendUnique(['a'], 'a')).toEqual(['a']);
    expect(appendUnique(['a', 'b', 'c', 'd'], 'e')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('admite cap personalizado', () => {
    expect(appendUnique(['a'], 'b', 1)).toEqual(['a']);
  });
});

describe('moveItem', () => {
  it('mueve un elemento a la nueva posición', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('devuelve el array original cuando los índices son inválidos', () => {
    const initial = ['a', 'b'];
    expect(moveItem(initial, -1, 0)).toBe(initial);
    expect(moveItem(initial, 0, 5)).toBe(initial);
    expect(moveItem(initial, 1, 1)).toBe(initial);
  });
});

describe('useCompareStore', () => {
  beforeEach(() => {
    useCompareStore.setState({ territoryIds: [] });
  });

  it('añade municipios sin pasar el cap', () => {
    const store = useCompareStore.getState();
    for (let i = 0; i < MAX_COMPARE_ITEMS + 2; i += 1) {
      store.add(`m${i}`);
    }
    expect(useCompareStore.getState().territoryIds).toHaveLength(MAX_COMPARE_ITEMS);
  });

  it('toggle elimina y vuelve a añadir', () => {
    const store = useCompareStore.getState();
    store.toggle('a');
    expect(useCompareStore.getState().territoryIds).toEqual(['a']);
    store.toggle('a');
    expect(useCompareStore.getState().territoryIds).toEqual([]);
  });

  it('reorder respeta los índices válidos', () => {
    const store = useCompareStore.getState();
    store.add('a');
    store.add('b');
    store.add('c');
    store.reorder(0, 2);
    expect(useCompareStore.getState().territoryIds).toEqual(['b', 'c', 'a']);
  });

  it('clear deja la lista vacía', () => {
    const store = useCompareStore.getState();
    store.add('a');
    store.add('b');
    store.clear();
    expect(useCompareStore.getState().territoryIds).toEqual([]);
  });
});
