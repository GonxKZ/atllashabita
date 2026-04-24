import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { DashboardShell } from '../DashboardShell';
import { useMapLayerStore } from '@/state/mapLayer';

const wrap = (node: ReactNode) => <MemoryRouter>{node}</MemoryRouter>;

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
  beforeEach(() => {
    useMapLayerStore.getState().resetActiveLayer();
    /* eslint-disable-next-line no-undef -- localStorage es global del navegador. */
    localStorage.clear();
  });

  it('muestra el hero con el titular principal de AtlasHabita', () => {
    render(wrap(<DashboardShell />));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /mejor lugar para vivir en España/i
    );
  });

  it('en modo embedded no monta sidebar/topbar (los provee RootLayout)', () => {
    render(wrap(<DashboardShell />));
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).toBeNull();
    expect(screen.queryByRole('searchbox', { name: 'Buscar en AtlasHabita' })).toBeNull();
  });

  it('expone el mini-LayerSwitcher de capas y lo sincroniza con el store', async () => {
    const user = userEvent.setup();
    render(wrap(<DashboardShell />));
    const group = screen.getByRole('radiogroup', { name: /capa activa del mapa/i });
    expect(group).toBeInTheDocument();
    const broadband = screen.getByRole('radio', { name: /banda ancha/i });
    await user.click(broadband);
    expect(useMapLayerStore.getState().activeLayerId).toBe('broadband');
    expect(broadband).toHaveAttribute('aria-checked', 'true');
  });
});
