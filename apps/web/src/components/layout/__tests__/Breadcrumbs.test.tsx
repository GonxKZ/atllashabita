import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { Breadcrumbs } from '../Breadcrumbs';

function renderInRouter(ui: ReactNode, initialEntries: string[] = ['/']) {
  return render(<MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>);
}

describe('Breadcrumbs', () => {
  it('no renderiza nada en la home', () => {
    const { container } = renderInRouter(<Breadcrumbs />);
    expect(container).toBeEmptyDOMElement();
  });

  it('infiere migas a partir de la ruta', () => {
    renderInRouter(<Breadcrumbs />, ['/mapa']);
    const nav = screen.getByRole('navigation', { name: /Migas de pan/i });
    expect(nav).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Inicio/i })).toBeInTheDocument();
    // El último ítem es la página activa, sin enlace.
    const current = screen.getByText(/Explorar mapa/i);
    expect(current.closest('[aria-current="page"]')).not.toBeNull();
  });

  it('admite items explícitos para territorios con nombre real', () => {
    renderInRouter(
      <Breadcrumbs
        items={[
          { label: 'Inicio', href: '/' },
          { label: 'Territorios', href: '/territorio' },
          { label: 'Sevilla' },
        ]}
      />,
      ['/territorio/sevilla']
    );
    expect(screen.getByText('Sevilla').closest('[aria-current="page"]')).not.toBeNull();
    expect(screen.getByRole('link', { name: /Territorios/i })).toBeInTheDocument();
  });

  it('marca el ítem activo con aria-current="page"', () => {
    renderInRouter(<Breadcrumbs />, ['/comparador']);
    const active = screen.getByText('Comparador');
    expect(active.closest('[aria-current="page"]')).not.toBeNull();
  });
});
