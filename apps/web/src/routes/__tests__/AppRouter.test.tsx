import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { beforeAll, describe, expect, it } from 'vitest';
import { HomeRoute, MapaRoute, RankingRoute, RootLayout, TerritoryRoute } from '../AppRouter';
import { NotFound } from '../NotFound';

/**
 * `RootLayout` monta `Sidebar` + `Topbar` + `<Outlet />`; las rutas
 * internas inyectan su propio contenido. `TrendsChart` requiere
 * `ResizeObserver`, ausente en jsdom: lo polyfillamos como en el resto de
 * tests que tocan recharts.
 */
beforeAll(() => {
  type Callback = (entries: unknown[], observer: unknown) => void;

  class ResizeObserverPolyfill {
    private readonly callback: Callback;

    constructor(callback: Callback) {
      this.callback = callback;
    }

    observe(target: Element) {
      this.callback(
        [
          {
            target,
            contentRect: {
              width: 600,
              height: 300,
              top: 0,
              left: 0,
              bottom: 300,
              right: 600,
              x: 0,
              y: 0,
              toJSON: () => ({}),
            },
            borderBoxSize: [],
            contentBoxSize: [],
            devicePixelContentBoxSize: [],
          },
        ],
        this
      );
    }

    unobserve() {}
    disconnect() {}
  }

  if (!('ResizeObserver' in globalThis)) {
    Object.defineProperty(globalThis, 'ResizeObserver', {
      value: ResizeObserverPolyfill,
      writable: true,
      configurable: true,
    });
  }
});

function renderAt(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: <RootLayout />,
        children: [
          { index: true, element: <HomeRoute /> },
          { path: 'mapa', element: <MapaRoute /> },
          { path: 'ranking', element: <RankingRoute /> },
          { path: 'territorio/:id', element: <TerritoryRoute /> },
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
  });

  it('navega a /mapa con su título propio', () => {
    renderAt('/mapa');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/explorar mapa/i);
  });

  it('navega a /ranking con su título propio', () => {
    renderAt('/ranking');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/ranking nacional/i);
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
