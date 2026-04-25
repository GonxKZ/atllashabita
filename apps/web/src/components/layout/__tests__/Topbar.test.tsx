/* eslint-disable no-undef -- localStorage es global del navegador. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Topbar } from '../Topbar';
import { useAuthStore } from '../../../state/auth';

function renderInRouter(ui: ReactNode, initialEntries: string[] = ['/']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

describe('Topbar (Atelier)', () => {
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

  it('muestra el hint del comando ⌘K con etiqueta accesible', () => {
    renderInRouter(<Topbar />);
    expect(screen.getByRole('button', { name: /Ver atajos rápidos/i })).toBeInTheDocument();
  });

  it('utiliza el placeholder atelier por defecto', () => {
    renderInRouter(<Topbar />);
    expect(screen.getByRole('searchbox', { name: 'Buscar en AtlasHabita' })).toHaveAttribute(
      'placeholder',
      'Buscar municipio o territorio…'
    );
  });

  it('envía la búsqueda cuando el formulario se envía', async () => {
    const onSearch = vi.fn();
    const user = userEvent.setup();
    renderInRouter(<Topbar onSearch={onSearch} />);
    const input = screen.getByRole('searchbox', { name: 'Buscar en AtlasHabita' });
    await user.type(input, 'Madrid{enter}');
    expect(onSearch).toHaveBeenCalledWith('Madrid');
  });

  it('dispara los callbacks de Feedback, notificaciones y "Nuevo análisis" al hacer clic', async () => {
    const onFeedback = vi.fn();
    const onNotifications = vi.fn();
    const onNewAnalysis = vi.fn();
    const user = userEvent.setup();

    renderInRouter(
      <Topbar
        onFeedback={onFeedback}
        onNotifications={onNotifications}
        onNewAnalysis={onNewAnalysis}
      />
    );

    await user.click(screen.getByRole('button', { name: /Feedback/i }));
    expect(onFeedback).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Notificaciones/i }));
    expect(onNotifications).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Nuevo análisis/i }));
    expect(onNewAnalysis).toHaveBeenCalledTimes(1);
  });

  it('abre el command palette al hacer clic en el hint ⌘K', async () => {
    const onOpenCommandPalette = vi.fn();
    const user = userEvent.setup();
    renderInRouter(<Topbar onOpenCommandPalette={onOpenCommandPalette} />);
    await user.click(screen.getByRole('button', { name: /Ver atajos rápidos/i }));
    expect(onOpenCommandPalette).toHaveBeenCalledTimes(1);
  });

  it('muestra el acceso a cuenta cuando no hay usuario sin exponer login en el shell', () => {
    renderInRouter(<Topbar />);
    expect(screen.queryByRole('link', { name: /Iniciar sesión/i })).toBeNull();
    const link = screen.getByRole('link', { name: /Abrir cuenta/i });
    expect(link).toHaveAttribute('href', '/cuenta');
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

  it('expone migas de pan cuando se navega a una ruta interior', () => {
    renderInRouter(<Topbar />, ['/mapa']);
    const breadcrumbs = screen.getByRole('navigation', { name: /Migas de pan/i });
    expect(breadcrumbs).toBeInTheDocument();
  });
});
