import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('renderiza el texto y expone un nombre accesible', () => {
    render(<Button>Nuevo análisis</Button>);
    const button = screen.getByRole('button', { name: 'Nuevo análisis' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('type', 'button');
  });

  it('reacciona al clic y admite estado deshabilitado', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Enviar</Button>);
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Enviar
      </Button>
    );
    await user.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('aplica estilos de variante primaria por defecto', () => {
    render(<Button>Primario</Button>);
    const button = screen.getByRole('button', { name: 'Primario' });
    expect(button.className).toMatch(/bg-brand-500/);
  });
});
