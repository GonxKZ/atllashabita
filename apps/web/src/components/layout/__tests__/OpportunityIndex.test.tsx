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
});
