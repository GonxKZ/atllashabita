/* eslint-disable no-undef -- localStorage es global del navegador. */
/**
 * Tests del store de capa activa del mapa.
 *
 * Comprueba que el store tiene un id por defecto, que `setActiveLayer`
 * actualiza el estado y que `localStorage` recibe la persistencia con la
 * clave reservada `atlashabita:map-layer`.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_MAP_LAYER_ID, useMapLayerStore } from '../mapLayer';

describe('useMapLayerStore', () => {
  beforeEach(() => {
    useMapLayerStore.getState().resetActiveLayer();
    localStorage.clear();
  });

  it('inicia en la capa score por defecto', () => {
    expect(useMapLayerStore.getState().activeLayerId).toBe(DEFAULT_MAP_LAYER_ID);
  });

  it('actualiza la capa activa', () => {
    useMapLayerStore.getState().setActiveLayer('rent_price');
    expect(useMapLayerStore.getState().activeLayerId).toBe('rent_price');
  });

  it('persiste la capa activa en localStorage', () => {
    useMapLayerStore.getState().setActiveLayer('broadband');
    const persisted = localStorage.getItem('atlashabita:map-layer');
    expect(persisted).toBeTruthy();
    expect(persisted).toContain('broadband');
  });

  it('reset vuelve a score', () => {
    useMapLayerStore.getState().setActiveLayer('mobility');
    useMapLayerStore.getState().resetActiveLayer();
    expect(useMapLayerStore.getState().activeLayerId).toBe(DEFAULT_MAP_LAYER_ID);
  });
});
