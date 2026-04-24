import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from '../Progress';

describe('Progress', () => {
  it('expone role="progressbar" con valores ARIA correctos', () => {
    render(<Progress label="Índice de oportunidad" value={72} />);
    const bar = screen.getByRole('progressbar', { name: 'Índice de oportunidad' });
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(bar).toHaveAttribute('aria-valuenow', '72');
  });

  it('limita valores fuera de rango', () => {
    render(<Progress label="Test" value={150} hideLabel />);
    const bar = screen.getByRole('progressbar', { name: 'Test' });
    expect(bar).toHaveAttribute('aria-valuenow', '100');
  });
});
