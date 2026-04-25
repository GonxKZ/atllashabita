import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  it('expone el contenido en role tooltip', () => {
    render(
      <Tooltip content="Datos del INE">
        <button type="button">Indicador</button>
      </Tooltip>
    );
    const tooltip = screen.getByRole('tooltip', { hidden: true });
    expect(tooltip).toHaveTextContent('Datos del INE');
  });

  it('asocia el disparador al tooltip vía aria-describedby', () => {
    render(
      <Tooltip content="Mensaje">
        <button type="button">Foco</button>
      </Tooltip>
    );
    const trigger = screen.getByRole('button', { name: 'Foco' });
    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const tooltip = describedBy ? document.getElementById(describedBy) : null;
    expect(tooltip).not.toBeNull();
    expect(tooltip).toHaveAttribute('role', 'tooltip');
  });

  it('respeta el modo controlado open', () => {
    render(
      <Tooltip content="Forzado" open>
        <button type="button">Trigger</button>
      </Tooltip>
    );
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
  });
});
