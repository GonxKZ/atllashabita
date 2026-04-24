import { render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it } from 'vitest';
import { DashboardShell } from '../DashboardShell';

/**
 * jsdom no implementa `ResizeObserver`. El panel lateral del dashboard
 * incluye `TrendsChart`, que delega en `recharts` y exige el observer
 * para medir el `ResponsiveContainer`. Replicamos el polyfill que ya usa
 * `features/trends/__tests__/TrendsChart.test.tsx` para que ambos tests
 * compartan el mismo entorno controlado.
 */
beforeAll(() => {
  type Callback = (entries: unknown[], observer: unknown) => void;

  class ResizeObserverPolyfill {
    private readonly callback: Callback;

    constructor(callback: Callback) {
      this.callback = callback;
    }

    observe(target: Element) {
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

  if (!('ResizeObserver' in globalThis)) {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: ResizeObserverPolyfill,
      writable: true,
      configurable: true,
    });
  }
});

describe('DashboardShell', () => {
  it('muestra el hero con el titular principal de AtlasHabita', () => {
    render(<DashboardShell />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /mejor lugar para vivir en España/i
    );
  });

  it('compone el shell con sidebar, topbar y panel lateral', () => {
    render(<DashboardShell />);
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar en AtlasHabita' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuevo análisis/i })).toBeInTheDocument();
  });
});
