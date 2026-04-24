import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HeroBanner } from '../HeroBanner';

describe('HeroBanner', () => {
  it('renderiza los 5 chips de filtro por defecto', () => {
    render(<HeroBanner />);

    const chipList = screen.getByRole('list', { name: /filtros rápidos/i });
    expect(chipList).toBeInTheDocument();

    const labels = [
      'Calidad de vida',
      'Vivienda asequible',
      'Empleo',
      'Conectividad',
      'Más filtros',
    ];

    for (const label of labels) {
      expect(screen.getByRole('button', { name: new RegExp(label, 'i') })).toBeInTheDocument();
    }
  });

  it('cambia el chip activo al hacer click', async () => {
    const onChipChange = vi.fn();
    render(<HeroBanner onChipChange={onChipChange} />);

    const jobsButton = screen.getByRole('button', { name: /empleo/i });
    await userEvent.click(jobsButton);

    expect(jobsButton).toHaveAttribute('aria-pressed', 'true');
    expect(onChipChange).toHaveBeenCalledWith('jobs');
  });
});
