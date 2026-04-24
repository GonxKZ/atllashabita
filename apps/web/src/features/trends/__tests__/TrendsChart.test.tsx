import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';

import { TrendsChart } from '../TrendsChart';
import { mockTrends } from '@/data/mock';

/**
 * jsdom no implementa ResizeObserver ni reporta dimensiones reales a
 * `getBoundingClientRect`. Proveemos polyfills de ámbito local antes de
 * renderizar el `ResponsiveContainer` de Recharts para que el chart pueda
 * asumir un tamaño útil y producir los ejes SVG.
 */
beforeAll(() => {
  type Callback = (entries: unknown[], observer: unknown) => void;

  class ResizeObserverPolyfill {
    private readonly callback: Callback;

    constructor(callback: Callback) {
      this.callback = callback;
    }

    observe(target: Element) {
      // Simulamos una medición inmediata con dimensiones fijas.
      this.callback(
        [
          {
            target,
            contentRect: {
              width: 600,
              height: 300,
              top: 0,
              left: 0,
              bottom: 300,
              right: 600,
              x: 0,
              y: 0,
              toJSON: () => ({}),
            },
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: [],
          },
        ],
        this
      );
    }

    unobserve() {}
    disconnect() {}
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    value: ResizeObserverPolyfill,
    writable: true,
    configurable: true,
  });

  // Forzamos un bounding rect no nulo para todo elemento en jsdom.
  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      width: 600,
      height: 300,
      top: 0,
      left: 0,
      bottom: 300,
      right: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  });
});

describe('TrendsChart', () => {
  it('muestra el título y un SVG con ejes Recharts', () => {
    const { container, getByText } = render(<TrendsChart data={mockTrends} />);

    expect(getByText(/Tendencia de calidad de vida/i)).toBeInTheDocument();

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(1);

    const axes = container.querySelectorAll('.recharts-xAxis, .recharts-yAxis');
    expect(axes.length).toBeGreaterThanOrEqual(2);
  });
});
