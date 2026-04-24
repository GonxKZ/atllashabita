import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SparqlPlayground } from '../SparqlPlayground';
import { parseBindings } from '../schema';
import { getFallbackCatalog } from '../fallbackCatalog';

function renderPlayground() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <SparqlPlayground />
    </QueryClientProvider>
  );
}

describe('parseBindings', () => {
  it('valida enteros y marca errores cuando falta un obligatorio', () => {
    const result = parseBindings(
      [
        { name: 'limit', label: 'Limit', type: 'integer', required: true },
        { name: 'flag', label: 'Flag', type: 'boolean' },
      ],
      { limit: '', flag: 'true' }
    );
    expect(result.success).toBe(false);
  });

  it('coerciona valores válidos al tipo correcto', () => {
    const result = parseBindings(
      [{ name: 'limit', label: 'Limit', type: 'integer', required: true }],
      { limit: '20' }
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });
});

describe('SparqlPlayground', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    globalThis.fetch = vi.fn(async () => {
      throw new Error('Network down for tests');
    }) as unknown as typeof fetch;
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('muestra el catálogo local cuando la API falla', async () => {
    renderPlayground();
    await waitFor(() => expect(screen.getByText(/Catálogo local/i)).toBeInTheDocument());
    const select = screen.getByTestId('sparql-selector');
    expect(select).toBeInTheDocument();
    expect(getFallbackCatalog().entries.length).toBeGreaterThanOrEqual(3);
  });

  it('ejecuta la consulta por defecto y pinta una tabla de resultados', async () => {
    const user = userEvent.setup();
    renderPlayground();
    await waitFor(() => expect(screen.getByTestId('sparql-run')).toBeEnabled());
    await user.click(screen.getByTestId('sparql-run'));
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument());
    expect(screen.getAllByRole('row').length).toBeGreaterThan(1);
  });
});
