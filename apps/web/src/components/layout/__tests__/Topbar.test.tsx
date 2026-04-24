import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Topbar } from '../Topbar';

describe('Topbar', () => {
  it('renderiza buscador accesible, Feedback y botón primario', () => {
    render(<Topbar />);
    expect(screen.getByRole('searchbox', { name: 'Buscar en AtlasHabita' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Feedback/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuevo análisis/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notificaciones/i })).toBeInTheDocument();
  });

  it('envía la búsqueda cuando el formulario se envía', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    render(<Topbar onSearch={onSearch} />);
    const input = screen.getByRole('searchbox', { name: 'Buscar en AtlasHabita' });
    await user.type(input, 'Madrid{enter}');
    expect(onSearch).toHaveBeenCalledWith('Madrid');
  });

  it('dispara los callbacks de Feedback y "Nuevo análisis" al hacer clic', async () => {
    const onFeedback = vi.fn();
    const onNewAnalysis = vi.fn();
    const user = userEvent.setup();

    render(<Topbar onFeedback={onFeedback} onNewAnalysis={onNewAnalysis} />);

    await user.click(screen.getByRole('button', { name: /Feedback/i }));
    expect(onFeedback).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Nuevo análisis/i }));
    expect(onNewAnalysis).toHaveBeenCalledTimes(1);
  });
});
