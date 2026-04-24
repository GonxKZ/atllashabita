import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TerritoryDetail } from '../TerritoryDetail';
import { NATIONAL_MUNICIPALITIES } from '../../../data/national_mock';
import { buildFallbackTurtle } from '../RdfExportModal';

function renderDetail(municipalityId: string) {
  const entry = NATIONAL_MUNICIPALITIES.find((m) => m.id === municipalityId);
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TerritoryDetail municipality={entry} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('TerritoryDetail', () => {
  it('muestra el nombre, jerarquía y población del municipio', () => {
    renderDetail('28079');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Madrid');
    expect(screen.getAllByText(/3.305.408/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Madrid/i).length).toBeGreaterThan(0);
  });

  it('renderiza la tabla de indicadores con chips de procedencia', () => {
    renderDetail('48020');
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(screen.getAllByText(/INE/i).length).toBeGreaterThan(0);
  });

  it('abre el modal "Ver RDF" al pulsar el botón', async () => {
    const user = userEvent.setup();
    renderDetail('41091');
    await user.click(screen.getByTestId('open-rdf-modal'));
    expect(screen.getByRole('dialog', { name: /Grafo RDF · Sevilla/i })).toBeInTheDocument();
  });
});

describe('buildFallbackTurtle', () => {
  it('genera Turtle con prefijos, score y procedencia PROV-O', () => {
    const entry = NATIONAL_MUNICIPALITIES[0];
    const turtle = buildFallbackTurtle(entry);
    expect(turtle).toContain('@prefix ah:');
    expect(turtle).toContain(`ah:territory/${entry.id}`);
    expect(turtle).toContain('prov:wasDerivedFrom');
  });
});
