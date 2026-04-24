/* eslint-disable no-undef -- localStorage es global del navegador. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Topbar } from '../Topbar';
import { useAuthStore } from '../../../state/auth';

function renderInRouter(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('Topbar', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
  });

  it('renderiza buscador accesible, Feedback y botón primario', () => {
    renderInRouter(<Topbar />);
    expect(screen.getByRole('searchbox', { name: 'Buscar en AtlasHabita' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Feedback/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuevo análisis/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Notificaciones/i })).toBeInTheDocument();
  });

  it('envía la búsqueda cuando el formulario se envía', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    renderInRouter(<Topbar onSearch={onSearch} />);
    const input = screen.getByRole('searchbox', { name: 'Buscar en AtlasHabita' });
    await user.type(input, 'Madrid{enter}');
    expect(onSearch).toHaveBeenCalledWith('Madrid');
  });

  it('dispara los callbacks de Feedback y "Nuevo análisis" al hacer clic', async () => {
    const onFeedback = vi.fn();
    const onNewAnalysis = vi.fn();
    const user = userEvent.setup();

    renderInRouter(<Topbar onFeedback={onFeedback} onNewAnalysis={onNewAnalysis} />);

    await user.click(screen.getByRole('button', { name: /Feedback/i }));
    expect(onFeedback).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Nuevo análisis/i }));
    expect(onNewAnalysis).toHaveBeenCalledTimes(1);
  });

  it('muestra "Iniciar sesión" cuando no hay usuario', () => {
    renderInRouter(<Topbar />);
    const link = screen.getByRole('link', { name: /Iniciar sesión/i });
    expect(link).toHaveAttribute('href', '/login');
  });

  it('muestra el menú de cuenta y permite cerrar sesión cuando hay usuario', async () => {
    const result = useAuthStore.getState().signUp({
      email: 'maria@example.com',
      password: 'Aaaaaa1z',
      name: 'María Castro',
    });
    expect(result.ok).toBe(true);

    const user = userEvent.setup();
    renderInRouter(<Topbar />);
    expect(
      screen.getByRole('link', { name: /Ir a mi cuenta de María Castro/i })
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Cerrar sesión/i }));
    expect(useAuthStore.getState().user).toBeNull();
  });
});
