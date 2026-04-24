import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { DashboardLayout, RoutePlaceholder } from '../AppRouter';
import { NotFound } from '../NotFound';

function renderAt(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <DashboardLayout />,
        children: [
          { index: true, element: <RoutePlaceholder label="dashboard" /> },
          { path: 'mapa', element: <RoutePlaceholder label="mapa" /> },
          { path: 'recomendador', element: <RoutePlaceholder label="recomendador" /> },
          { path: 'comparador', element: <RoutePlaceholder label="comparador" /> },
          { path: 'escenarios', element: <RoutePlaceholder label="escenarios" /> },
          { path: 'territorio/:id', element: <RoutePlaceholder label="territorio" /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
    { initialEntries: [initialPath] }
  );
  return render(<RouterProvider router={router} />);
}

describe('AppRouter', () => {
  it('renderiza el dashboard en la raíz', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /mejor lugar.*vivir en españa/i
    );
    expect(screen.getByRole('region', { name: 'dashboard' })).toBeInTheDocument();
  });

  it('renderiza placeholders para cada ruta principal', () => {
    renderAt('/mapa');
    expect(screen.getByRole('region', { name: 'mapa' })).toBeInTheDocument();
  });

  it('resuelve la ruta de territorio con parámetro dinámico', () => {
    renderAt('/territorio/municipality:41091');
    expect(screen.getByRole('region', { name: 'territorio' })).toBeInTheDocument();
  });

  it('muestra NotFound ante ruta desconocida', () => {
    renderAt('/ruta-inexistente');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/pantalla no encontrada/i);
  });
});
