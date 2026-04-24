/**
 * Tests deterministas del catálogo de capas.
 *
 * Verifican que:
 *  - El catálogo expone al menos las ocho capas que el issue requiere.
 *  - Los selectores extraen el indicador correcto de un punto enriquecido.
 *  - `computeLayerDomain` ignora puntos vacíos y resiste valores idénticos.
 *  - `valueToColor` mapea de forma monótona dentro del dominio.
 *  - `buildLegendStops` produce un número de tramos igual al de la paleta.
 */

import { describe, expect, it } from 'vitest';

import {
  MAP_LAYER_CATALOG,
  buildLegendStops,
  computeLayerDomain,
  resolveLayer,
  valueToColor,
  valueToRadius,
  type EnrichedMapPoint,
} from '../catalog';

const sample: EnrichedMapPoint = {
  id: '00001',
  name: 'Test',
  lat: 0,
  lon: 0,
  score: 80,
  value: 80,
  population: 50_000,
  province: 'Sevilla',
  autonomousCommunity: 'Andalucía',
  indicators: [
    {
      id: 'rent_price',
      label: 'Alquiler medio',
      value: 950,
      unit: '€/mes',
      sourceId: 'ine_housing',
      quality: 'ok',
    },
    {
      id: 'broadband',
      label: 'Banda ancha',
      value: 95,
      unit: '%',
      sourceId: 'miteco_broadband',
      quality: 'ok',
    },
    { id: 'income', label: 'Renta', value: 28000, unit: '€', sourceId: 'ine_rent', quality: 'ok' },
    {
      id: 'services',
      label: 'Servicios',
      value: 2.6,
      unit: 'ratio',
      sourceId: 'msan_services',
      quality: 'ok',
    },
    {
      id: 'climate',
      label: 'Clima',
      value: 17.4,
      unit: '°C',
      sourceId: 'aemet_climate',
      quality: 'ok',
    },
    {
      id: 'mobility',
      label: 'Mobilidad',
      value: 30,
      unit: 'min',
      sourceId: 'mitma_mobility',
      quality: 'ok',
    },
    {
      id: 'accidents',
      label: 'Accidentes',
      value: 8,
      unit: 'víctimas/año',
      sourceId: 'dgt_accidents',
      quality: 'ok',
    },
    {
      id: 'transit',
      label: 'Transporte',
      value: 70,
      unit: '%',
      sourceId: 'crtm_transit',
      quality: 'ok',
    },
  ],
};

describe('catálogo de capas', () => {
  it('expone al menos ocho capas distintas', () => {
    expect(MAP_LAYER_CATALOG.length).toBeGreaterThanOrEqual(8);
    const ids = new Set(MAP_LAYER_CATALOG.map((layer) => layer.id));
    expect(ids.size).toBe(MAP_LAYER_CATALOG.length);
  });

  it('cada capa declara metadata accesibles', () => {
    for (const layer of MAP_LAYER_CATALOG) {
      expect(layer.label.length).toBeGreaterThan(0);
      expect(layer.description.length).toBeGreaterThan(0);
      expect(layer.palette).toHaveLength(5);
      expect(typeof layer.selector).toBe('function');
    }
  });

  it('los selectores extraen el indicador correcto', () => {
    const broadband = resolveLayer('broadband');
    expect(broadband.selector(sample)).toBe(95);
    const accidents = resolveLayer('accidents');
    expect(accidents.selector(sample)).toBe(8);
    const score = resolveLayer('score');
    expect(score.selector(sample)).toBe(80);
  });

  it('resolveLayer cae al score con id desconocido', () => {
    expect(resolveLayer('invalid' as never).id).toBe('score');
  });

  it('computeLayerDomain devuelve rango ensanchado cuando todos los valores son iguales', () => {
    const layer = resolveLayer('score');
    const domain = computeLayerDomain([sample], layer);
    expect(domain.max - domain.min).toBeGreaterThan(0);
  });

  it('computeLayerDomain devuelve [0, 1] cuando no hay puntos', () => {
    const layer = resolveLayer('score');
    const domain = computeLayerDomain([], layer);
    expect(domain).toEqual({ min: 0, max: 1 });
  });

  it('valueToColor escoge el primer color para el máximo y el último para el mínimo', () => {
    const layer = resolveLayer('score');
    const domain = { min: 0, max: 100 };
    const top = valueToColor(100, layer, domain);
    const bottom = valueToColor(0, layer, domain);
    expect(top).toBe(layer.palette[0]);
    expect(bottom).toBe(layer.palette[layer.palette.length - 1]);
  });

  it('valueToRadius interpola dentro de los bounds esperados', () => {
    const radius = valueToRadius(50, { min: 0, max: 100 });
    expect(radius).toBeGreaterThanOrEqual(12);
    expect(radius).toBeLessThanOrEqual(28);
  });

  it('buildLegendStops genera tantos tramos como colores tiene la paleta', () => {
    const layer = resolveLayer('rent_price');
    const stops = buildLegendStops(layer, { min: 400, max: 1500 });
    expect(stops).toHaveLength(layer.palette.length);
    // Los tramos deben cubrir el dominio completo.
    expect(stops[0].min).toBe(400);
    expect(stops[stops.length - 1].max).toBe(1500);
  });
});
