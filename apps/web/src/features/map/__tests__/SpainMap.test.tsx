import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// maplibre-gl usa WebGL, que jsdom no implementa. Sustituimos el módulo por un
// objeto vacío porque `react-map-gl` sólo lo usa como peer dependency.
vi.mock('maplibre-gl', () => ({ default: {} }));

// Reemplazamos los componentes de react-map-gl por contenedores predecibles
// para poder aserta estructura sin inicializar un canvas real.
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
});
