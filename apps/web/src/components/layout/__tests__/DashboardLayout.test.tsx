import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardLayout } from '../DashboardLayout';

describe('DashboardLayout', () => {
  it('compone Sidebar, Topbar y slots principales', () => {
    render(
      <MemoryRouter>
        <DashboardLayout
          hero={<h1 id="dashboard-title">Hero aquí</h1>}
          side={<p>Panel lateral</p>}
          footer={<p>Acciones</p>}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar en AtlasHabita' })).toBeInTheDocument();
    expect(screen.getByText('Hero aquí')).toBeInTheDocument();
    expect(screen.getByText('Panel lateral')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });

  it('en modo embedded omite sidebar y topbar', () => {
    render(
      <MemoryRouter>
        <DashboardLayout embedded hero={<h1>Solo contenido</h1>} />
      </MemoryRouter>
    );
    expect(screen.queryByRole('navigation', { name: 'Navegación principal' })).toBeNull();
    expect(screen.queryByRole('searchbox', { name: 'Buscar en AtlasHabita' })).toBeNull();
    expect(screen.getByText('Solo contenido')).toBeInTheDocument();
  });
});
