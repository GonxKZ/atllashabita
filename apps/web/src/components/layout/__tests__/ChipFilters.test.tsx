import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChipFilters, type ChipFilterOption } from '../ChipFilters';

const OPTIONS: ChipFilterOption[] = [
  { id: 'quality', label: 'Calidad de vida' },
  { id: 'housing', label: 'Vivienda asequible' },
  { id: 'jobs', label: 'Empleo' },
];

describe('ChipFilters', () => {
  it('expone un grupo de chips con etiqueta accesible', () => {
    render(<ChipFilters options={OPTIONS} value={[]} />);
    const group = screen.getByRole('group', { name: /filtros rápidos/i });
    expect(group).toBeInTheDocument();
  });

  it('marca como pulsada la chip activa con aria-pressed', () => {
    render(<ChipFilters options={OPTIONS} value={['quality']} />);
    const active = screen.getByRole('button', { name: /Calidad de vida/i });
    expect(active).toHaveAttribute('aria-pressed', 'true');

    const inactive = screen.getByRole('button', { name: /Empleo/i });
    expect(inactive).toHaveAttribute('aria-pressed', 'false');
  });

  it('dispara onToggle con el id de la chip cuando se hace click', async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(<ChipFilters options={OPTIONS} value={[]} onToggle={onToggle} />);

    await user.click(screen.getByRole('button', { name: /Empleo/i }));
    expect(onToggle).toHaveBeenCalledWith('jobs');
  });

  it('admite la variante onBrand con etiqueta accesible personalizada', () => {
    render(
      <ChipFilters
        options={OPTIONS}
        value={['quality']}
        tone="onBrand"
        aria-label="Filtros sobre hero"
      />
    );
    expect(screen.getByRole('group', { name: 'Filtros sobre hero' })).toBeInTheDocument();
  });
});
