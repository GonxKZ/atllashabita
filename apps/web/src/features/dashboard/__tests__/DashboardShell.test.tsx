import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { DashboardShell } from '../DashboardShell';
import { useMapLayerStore } from '@/state/mapLayer';
import { useUiStore } from '@/state/ui';
import { NATIONAL_MUNICIPALITIES } from '@/data/national_mock';
import { DEFAULT_WEIGHTS, useEscenariosStore, type WeightVector } from '@/state/escenariosStore';

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
    useUiStore.getState().reset();
    useEscenariosStore.setState({
      weights: { ...DEFAULT_WEIGHTS },
      baseline: { ...DEFAULT_WEIGHTS },
      scenarios: [],
    });
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

  it('monta los overlays Atelier (FloatingRanking, RichLegend, MiniMap)', () => {
    render(wrap(<DashboardShell />));
    expect(screen.getByLabelText(/ranking de municipios/i)).toBeInTheDocument();
    expect(screen.getByTestId('rich-legend')).toBeInTheDocument();
    expect(screen.getByTestId('mini-map')).toBeInTheDocument();
  });

  it('abre la TerritorySheet cuando el store recibe un selectedTerritoryId', () => {
    const target = NATIONAL_MUNICIPALITIES[0];
    render(wrap(<DashboardShell />));
    expect(screen.queryByTestId('territory-sheet')).toBeNull();
    act(() => {
      useUiStore.getState().openTerritorySheet(target.id);
    });
    expect(screen.getByTestId('territory-sheet')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(target.name);
  });

  it('atajo `]` rota la capa activa del mapa a través de RichLegend', () => {
    render(wrap(<DashboardShell />));
    expect(useMapLayerStore.getState().activeLayerId).toBe('score');
    fireEvent.keyDown(window, { key: ']' });
    expect(useMapLayerStore.getState().activeLayerId).not.toBe('score');
  });

  it('recalcula el score del mapa con los pesos del simulador de escenarios', () => {
    const heavyRent: WeightVector = {
      rent_price: 0.95,
      income: 0.05,
      broadband: 0,
      services: 0,
      air_quality: 0,
      mobility: 0,
      transit: 0,
      climate: 0,
    };

    act(() => {
      useEscenariosStore.getState().setWeights(heavyRent);
    });

    render(wrap(<DashboardShell />));
    expect(screen.getByText(/Mezcla personalizada activa/i)).toBeInTheDocument();
  });
});
