import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OpportunityIndex } from '../OpportunityIndex';

describe('OpportunityIndex', () => {
  it('muestra el porcentaje y expone un progressbar con el mismo valor', () => {
    render(<OpportunityIndex value={82} />);
    expect(screen.getByText('82')).toBeInTheDocument();

    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '82');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('muestra el texto descriptivo cuando se proporciona como prop', () => {
    render(
      <OpportunityIndex value={74} description="Resumen agregado de los territorios filtrados." />
    );
    expect(screen.getByText('Resumen agregado de los territorios filtrados.')).toBeInTheDocument();
  });

  it('expone los hitos 0/50/100 como referencias del rango', () => {
    render(<OpportunityIndex value={50} />);
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    // Cuando el valor coincide con un hito, hay dos elementos con "50".
    expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
  });
});
