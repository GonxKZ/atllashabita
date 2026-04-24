import '@testing-library/jest-dom/vitest';
import * as React from 'react';
import { vi } from 'vitest';

// `maplibre-gl` y `react-map-gl/maplibre` requieren `URL.createObjectURL` y un
// contexto WebGL que jsdom no provee. Para que los tests del shell renderizen
// el mapa sin tocar red ni Canvas/WebGL, los sustituimos por componentes
// mínimos accesibles que conservan la API consumida por el código.

vi.mock('maplibre-gl', () => ({
  default: {},
  Map: class {},
  Marker: class {},
}));

vi.mock('react-map-gl/maplibre', () => {
  const Map = ({ children, ariaLabel }: { children?: React.ReactNode; ariaLabel?: string }) =>
    React.createElement(
      'div',
      {
        role: 'img',
        'aria-label': ariaLabel ?? 'Mapa simulado en jsdom',
        'data-testid': 'map-stub',
      },
      children
    );
  const Marker = ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'map-marker' }, children);
  const NavigationControl = () =>
    React.createElement('div', { 'data-testid': 'map-navigation' });
  return { default: Map, Map, Marker, NavigationControl };
});

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));
