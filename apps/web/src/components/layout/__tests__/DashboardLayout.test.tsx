import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardLayout } from '../DashboardLayout';

describe('DashboardLayout', () => {
  it('compone Sidebar, Topbar y slots principales', () => {
    render(
      <DashboardLayout
        hero={<h1 id="dashboard-title">Hero aquí</h1>}
        side={<p>Panel lateral</p>}
        footer={<p>Acciones</p>}
      />
    );

    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar en AtlasHabita' })).toBeInTheDocument();
    expect(screen.getByText('Hero aquí')).toBeInTheDocument();
    expect(screen.getByText('Panel lateral')).toBeInTheDocument();
    expect(screen.getByText('Acciones')).toBeInTheDocument();
  });
});
