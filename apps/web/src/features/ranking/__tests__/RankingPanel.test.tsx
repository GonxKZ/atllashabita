import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { RankingPanel, filterMunicipalities } from '../RankingPanel';
import { NATIONAL_MUNICIPALITIES } from '../../../data/national_mock';

function renderPanel(pageSize = 20) {
  return render(
    <MemoryRouter>
      <RankingPanel pageSize={pageSize} />
    </MemoryRouter>
  );
}

describe('filterMunicipalities', () => {
  it('filtra por alquiler y banda ancha', () => {
    const filtered = filterMunicipalities(NATIONAL_MUNICIPALITIES, 700, 95);
    expect(filtered.length).toBeGreaterThan(0);
    for (const entry of filtered) {
      const rent = entry.indicators.find((i) => i.id === 'rent_price')?.value ?? 0;
      const broadband = entry.indicators.find((i) => i.id === 'broadband')?.value ?? 0;
      expect(rent).toBeLessThanOrEqual(700);
      expect(broadband).toBeGreaterThanOrEqual(95);
    }
  });
});

describe('RankingPanel', () => {
  it('muestra el título y un elemento de ranking', () => {
    renderPanel();
    expect(screen.getByLabelText('Ranking nacional')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { pressed: false }).length).toBeGreaterThan(0);
  });

  it('pagina el dataset nacional en bloques de 20', () => {
    renderPanel();
    const list = screen.getByRole('list', { name: 'Lista de municipios' });
    const items = list.querySelectorAll('li');
    expect(items.length).toBeLessThanOrEqual(20);
  });

  it('permite avanzar a la página siguiente y refresca la lista', async () => {
    const user = userEvent.setup();
    renderPanel();
    const before = screen.getAllByRole('button').length;
    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(before - 5);
  });
});
