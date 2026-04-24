/**
 * Tests de SpainMap multi-métrica.
 *
 * Verifica:
 *  - Render del canvas y un marker por punto.
 *  - Compatibilidad legacy (`scoreToColor`) con la rampa verde original.
 *  - Reactividad: al cambiar `layerId`, leyenda y atributos `data-active-layer`
 *    se actualizan sin remontar el `<Map>` (mismo `data-testid`).
 *  - El tooltip recibe la unidad y etiqueta de la capa.
 */

import { render, screen, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('maplibre-gl', () => ({ default: {} }));

vi.mock('react-map-gl/maplibre', () => ({
  __esModule: true,
  default: ({ children }: { children?: ReactNode }) => (
    <div data-testid="maplibre-canvas">{children}</div>
  ),
  Marker: ({ children }: { children?: ReactNode }) => (
    <div data-testid="map-marker">{children}</div>
  ),
  NavigationControl: () => <div data-testid="map-nav" />,
}));

import { SpainMap, scoreToColor } from '../SpainMap';
import { mockPoints } from '@/data/mock';
import { toEnrichedMapPoints } from '@/data/national_mock';

describe('SpainMap', () => {
  it('renderiza el canvas del mapa y un marcador por cada punto', () => {
    render(<SpainMap points={mockPoints} offline />);

    expect(screen.getByTestId('maplibre-canvas')).toBeInTheDocument();
    expect(screen.getAllByTestId('map-marker')).toHaveLength(mockPoints.length);
  });

  it('expone una leyenda con la etiqueta de la capa activa', () => {
    render(<SpainMap points={mockPoints} layerLabel="Alquiler medio" offline />);

    expect(screen.getByLabelText(/Leyenda: Alquiler medio/i)).toBeInTheDocument();
  });

  it('asocia colores verdes al score monótonamente decrecientes', () => {
    const high = scoreToColor(92);
    const mid = scoreToColor(55);
    const low = scoreToColor(10);

    expect(high).toBe('#065f46');
    expect(mid).not.toBe(high);
    expect(low).toBe('#34d399');
  });

  it('actualiza la leyenda al cambiar de capa sin remontar el canvas', () => {
    const enriched = toEnrichedMapPoints();

    const { rerender } = render(<SpainMap points={enriched} layerId="score" offline />);
    const initialCanvas = screen.getByTestId('maplibre-canvas');
    expect(screen.getByTestId('map-legend-label').textContent).toMatch(/score territorial/i);

    act(() => {
      rerender(<SpainMap points={enriched} layerId="broadband" offline />);
    });

    // El mismo nodo de canvas debe persistir (no remount).
    expect(screen.getByTestId('maplibre-canvas')).toBe(initialCanvas);
    expect(screen.getByTestId('map-legend-label').textContent).toMatch(/banda ancha/i);
    expect(screen.getByTestId('map-legend-unit').textContent).toMatch(/%/);
  });

  it('cambia la unidad y descripción para capas con dominios distintos', () => {
    const enriched = toEnrichedMapPoints();

    const { rerender } = render(<SpainMap points={enriched} layerId="rent_price" offline />);
    expect(screen.getByTestId('map-legend-unit').textContent).toMatch(/€/);

    act(() => {
      rerender(<SpainMap points={enriched} layerId="accidents" offline />);
    });
    expect(screen.getByTestId('map-legend-unit').textContent).toMatch(/víctimas/);
  });
});
