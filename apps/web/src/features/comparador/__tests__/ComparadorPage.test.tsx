import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
  ComparadorPage,
  buildCsv,
  buildJson,
  resolveSelection,
  searchMunicipalities,
} from '../ComparadorPage';
import { NATIONAL_MUNICIPALITIES } from '../../../data/national_mock';
import { useCompareStore } from '../../../state/compareStore';

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
              width: 800,
              height: 400,
              top: 0,
              left: 0,
              bottom: 400,
              right: 800,
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
  useCompareStore.setState({ territoryIds: [] });
});

describe('searchMunicipalities', () => {
  it('filtra por nombre', () => {
    const results = searchMunicipalities(NATIONAL_MUNICIPALITIES, 'Madrid');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.name.toLowerCase()).toContain('madrid');
  });

  it('devuelve todo cuando la query está vacía', () => {
    expect(searchMunicipalities(NATIONAL_MUNICIPALITIES, '')).toBe(NATIONAL_MUNICIPALITIES);
  });
});

describe('resolveSelection', () => {
  it('descarta IDs no encontrados', () => {
    const ids = ['28079', 'no_existe'];
    const result = resolveSelection(ids, NATIONAL_MUNICIPALITIES);
    expect(result).toHaveLength(1);
    expect(result[0]?.name.toLowerCase()).toContain('madrid');
  });
});

describe('buildCsv / buildJson', () => {
  const sample = NATIONAL_MUNICIPALITIES.slice(0, 2);

  it('genera CSV con encabezados correctos', () => {
    const csv = buildCsv(sample);
    const headerLine = csv.split('\n')[0] ?? '';
    expect(headerLine.startsWith('Indicador,Unidad,')).toBe(true);
    expect(headerLine).toContain(sample[0]!.name);
  });

  it('genera JSON serializable', () => {
    const json = buildJson(sample);
    const parsed = JSON.parse(json) as { municipalities: { id: string }[] };
    expect(parsed.municipalities).toHaveLength(2);
    expect(parsed.municipalities[0]?.id).toBe(sample[0]!.id);
  });
});

describe('ComparadorPage', () => {
  function renderPage() {
    return render(
      <MemoryRouter>
        <ComparadorPage />
      </MemoryRouter>
    );
  }

  it('muestra estado vacío sin selección', () => {
    renderPage();
    expect(screen.getByText(/Aún no comparas ningún municipio/i)).toBeInTheDocument();
  });

  it('añade un municipio desde la lista de candidatos', async () => {
    const user = userEvent.setup();
    renderPage();
    const target = NATIONAL_MUNICIPALITIES[0]!;
    const button = screen.getByTestId(`comparador-add-${target.id}`);
    await user.click(button);
    expect(useCompareStore.getState().territoryIds).toContain(target.id);
  });

  it('rinde la tabla cuando hay selección', () => {
    useCompareStore.setState({
      territoryIds: [NATIONAL_MUNICIPALITIES[0]!.id, NATIONAL_MUNICIPALITIES[1]!.id],
    });
    renderPage();
    expect(screen.getByTestId('compare-table')).toBeInTheDocument();
  });
});
