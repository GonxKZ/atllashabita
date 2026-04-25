import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Sidebar } from '../Sidebar';

function renderInRouter(ui: ReactNode, initialEntries: string[] = ['/']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

describe('Sidebar (Atelier)', () => {
  it('expone landmark de navegación con las cinco secciones principales', () => {
    renderInRouter(<Sidebar />);
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    expect(nav).toBeInTheDocument();

    const labels = ['Inicio', 'Explorar mapa', 'Recomendador', 'Comparador', 'Escenarios'];
    for (const label of labels) {
      expect(within(nav).getByRole('link', { name: new RegExp(label) })).toBeInTheDocument();
    }
  });

  it('marca la sección activa con aria-current', () => {
    renderInRouter(<Sidebar activeNavId="map" />);
    const nav = screen.getByRole('navigation', { name: 'Navegación principal' });
    const activeLink = within(nav).getByRole('link', { name: /Explorar mapa/ });
    expect(activeLink).toHaveAttribute('aria-current', 'page');
  });

  it('incluye la sección "Capas activas" en modo expandido', () => {
    renderInRouter(<Sidebar defaultCollapsed={false} />);
    const region = screen.getByRole('region', { name: /Capas activas/i });
    expect(region).toBeInTheDocument();
    const checkboxes = within(region).getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThanOrEqual(3);
  });

  it('alterna las capas activas al hacer click en sus checkboxes', async () => {
    const user = userEvent.setup();
    renderInRouter(<Sidebar defaultCollapsed={false} />);
    const region = screen.getByRole('region', { name: /Capas activas/i });
    const housingCheckbox = within(region).getByRole('checkbox', { name: /Vivienda asequible/i });
    expect(housingCheckbox).toBeChecked();

    await user.click(housingCheckbox);
    expect(housingCheckbox).not.toBeChecked();
  });

  it('expone el saludo "Hola, <Nombre>" del usuario en la card inferior', () => {
    renderInRouter(<Sidebar userName="María Castro" defaultCollapsed={false} />);
    expect(screen.getByText('Hola, María')).toBeInTheDocument();
  });

  it('en modo colapsado oculta etiquetas y muestra botón para expandir', () => {
    renderInRouter(<Sidebar collapsed userName="María Castro" />);
    const aside = screen.getByRole('complementary', { name: /Barra lateral/i });
    expect(aside).toHaveAttribute('data-collapsed', 'true');

    expect(screen.getByRole('button', { name: /Expandir barra lateral/i })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Capas activas/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Hola, María')).not.toBeInTheDocument();
  });

  it('aplica title accesible a los items de navegación cuando está colapsado', () => {
    renderInRouter(<Sidebar collapsed />);
    const link = screen.getByRole('link', { name: /Explorar mapa/i });
    expect(link).toHaveAttribute('title', 'Explorar mapa');
  });

  it('alterna entre expandido y colapsado al pulsar el toggle', async () => {
    const user = userEvent.setup();
    renderInRouter(<Sidebar defaultCollapsed={false} />);
    const collapseBtn = screen.getByRole('button', { name: /Contraer barra lateral/i });
    await user.click(collapseBtn);
    expect(screen.getByRole('button', { name: /Expandir barra lateral/i })).toBeInTheDocument();
  });
});
