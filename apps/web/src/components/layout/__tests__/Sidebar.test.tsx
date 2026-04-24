import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Sidebar } from '../Sidebar';

describe('Sidebar', () => {
  it('expone landmark de navegación con las cinco secciones principales', () => {
    render(<Sidebar />);
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(nav).toBeInTheDocument();

    const labels = ['Inicio', 'Explorar mapa', 'Recomendador', 'Comparador', 'Escenarios'];
    for (const label of labels) {
      expect(within(nav).getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('marca la sección activa con aria-current', () => {
    render(<Sidebar activeNavId="map" />);
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    const activeLink = within(nav).getByRole('link', { name: /Explorar mapa/ });
    expect(activeLink).toHaveAttribute('aria-current', 'page');
  });

  it('incluye la sección "Capas activas" con checkboxes accesibles', () => {
    render(<Sidebar />);
    const region = screen.getByRole('region', { name: /Capas activas/i });
    expect(region).toBeInTheDocument();
    const checkboxes = within(region).getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);
  });
});
