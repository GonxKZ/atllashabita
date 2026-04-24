import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_LAYER_DEFINITIONS, LayerSwitcher } from '../LayerSwitcher';

describe('LayerSwitcher', () => {
  it('renderiza al menos seis capas disponibles', () => {
    render(<LayerSwitcher />);
    expect(DEFAULT_LAYER_DEFINITIONS.length).toBeGreaterThanOrEqual(6);
    expect(screen.getAllByRole('switch').length).toBeGreaterThanOrEqual(6);
  });

  it('activa y desactiva capas en modo no controlado', async () => {
    const user = userEvent.setup();
    render(<LayerSwitcher />);
    const broadband = screen.getByRole('switch', { name: /banda ancha/i });
    expect(broadband).toHaveAttribute('aria-checked', 'false');
    await user.click(broadband);
    expect(broadband).toHaveAttribute('aria-checked', 'true');
  });

  it('propaga el cambio al padre cuando está controlado', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LayerSwitcher activeLayers={['score']} onChange={handleChange} />);
    await user.click(screen.getByRole('switch', { name: /renta por hogar/i }));
    expect(handleChange).toHaveBeenCalledWith(['score', 'income']);
  });
});
