import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Toggle } from '../Toggle';

describe('Toggle', () => {
  it('alterna el estado al pulsar el switch', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<Toggle label="Activar capa" checked={false} onCheckedChange={handle} />);

    const toggle = screen.getByRole('switch', { name: 'Activar capa' });
    expect(toggle).toHaveAttribute('aria-checked', 'false');

    await user.click(toggle);
    expect(handle).toHaveBeenCalledWith(true);
  });

  it('no reacciona cuando está deshabilitado', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(
      <Toggle
        label="Activar capa"
        checked
        helper="Solo lectura"
        disabled
        onCheckedChange={handle}
      />
    );

    const toggle = screen.getByRole('switch');
    await user.click(toggle);
    expect(handle).not.toHaveBeenCalled();
  });
});
