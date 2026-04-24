import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DashboardShell } from '../DashboardShell';

describe('DashboardShell', () => {
  it('muestra el hero con el titular principal de AtlasHabita', () => {
    render(<DashboardShell />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /mejor lugar para vivir en España/i
    );
  });

  it('compone el shell con sidebar, topbar y panel lateral', () => {
    render(<DashboardShell />);
    expect(screen.getByRole('navigation', { name: 'Navegación principal' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Buscar en AtlasHabita' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Nuevo análisis/i })).toBeInTheDocument();
  });
});
