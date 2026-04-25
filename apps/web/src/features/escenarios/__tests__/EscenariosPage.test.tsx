import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { EscenariosPage, rankMunicipalities, scoreMunicipality } from '../EscenariosPage';
import {
  DEFAULT_WEIGHTS,
  useEscenariosStore,
  type WeightVector,
} from '../../../state/escenariosStore';
import { NATIONAL_MUNICIPALITIES } from '../../../data/national_mock';

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
              height: 400,
              top: 0,
              left: 0,
              bottom: 400,
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

beforeEach(() => {
  useEscenariosStore.setState({
    weights: { ...DEFAULT_WEIGHTS },
    baseline: { ...DEFAULT_WEIGHTS },
    scenarios: [],
  });
});

describe('scoreMunicipality', () => {
  it('produce un valor entre 0 y 100', () => {
    const entry = NATIONAL_MUNICIPALITIES[0]!;
    const score = scoreMunicipality(entry, DEFAULT_WEIGHTS);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('rankMunicipalities', () => {
  it('devuelve los 10 mejores ordenados', () => {
    const ranking = rankMunicipalities(NATIONAL_MUNICIPALITIES, DEFAULT_WEIGHTS);
    expect(ranking.length).toBeLessThanOrEqual(10);
    for (let i = 1; i < ranking.length; i += 1) {
      expect(ranking[i - 1]!.score).toBeGreaterThanOrEqual(ranking[i]!.score);
    }
  });

  it('cambia el ranking si los pesos varían', () => {
    const baseline = rankMunicipalities(NATIONAL_MUNICIPALITIES, DEFAULT_WEIGHTS);
    const heavyRent: WeightVector = {
      ...DEFAULT_WEIGHTS,
      rent_price: 0.95,
      income: 0.05,
      broadband: 0,
      services: 0,
      air_quality: 0,
      mobility: 0,
      transit: 0,
      climate: 0,
    };
    const skewed = rankMunicipalities(NATIONAL_MUNICIPALITIES, heavyRent);
    expect(skewed[0]?.entry.id).not.toBe(baseline[0]?.entry.id);
  });
});

describe('EscenariosPage', () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <EscenariosPage />
      </MemoryRouter>
    );
  }

  it('renderiza los sliders y el ranking', () => {
    renderPage();
    expect(screen.getByTestId('weight-sliders')).toBeInTheDocument();
    expect(screen.getByTestId('escenarios-ranking')).toBeInTheDocument();
  });

  it('actualiza el peso al mover el slider', () => {
    renderPage();
    const slider = screen.getByLabelText('Alquiler asequible');
    fireEvent.change(slider, { target: { value: '0.9' } });
    expect(useEscenariosStore.getState().weights.rent_price).toBeCloseTo(0.9, 5);
  });

  it('guarda escenarios desde el formulario', async () => {
    const user = userEvent.setup();
    renderPage();
    const input = screen.getByLabelText(/Nombre del escenario/i);
    await user.type(input, 'Mi escenario');
    await user.click(screen.getByRole('button', { name: /Guardar escenario/i }));
    expect(useEscenariosStore.getState().scenarios).toHaveLength(1);
    expect(useEscenariosStore.getState().scenarios[0]?.name).toBe('Mi escenario');
  });
});
