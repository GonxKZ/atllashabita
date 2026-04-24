/**
 * Configuración de enrutado global con React Router v7.
 *
 * Se usa `createBrowserRouter` + `RouterProvider` para permitir splitting y
 * futuros `loader`/`action`. Todas las rutas internas comparten `DashboardShell`
 * como layout y exponen un `<Outlet />` donde se monta el contenido de cada
 * pantalla (mapa, recomendador, comparador, escenarios, ficha territorial).
 */

import { createBrowserRouter, Outlet } from 'react-router-dom';
import { DashboardShell } from '../features/dashboard/DashboardShell';
import { NotFound } from './NotFound';

/**
 * Layout común: renderiza la carcasa del dashboard (propiedad del feature) y,
 * a continuación, el `<Outlet />` con el contenido de la ruta activa.
 *
 * `DashboardShell` es owner del feature `features/dashboard` y no puede
 * alterarse desde aquí; por eso componemos ambos elementos como hermanos en
 * lugar de inyectar `children`. Cuando `DashboardShell` evolucione y acepte
 * children, el cambio aquí será local y mínimo.
 */
function DashboardLayout() {
  return (
    <>
      <DashboardShell />
      <Outlet />
    </>
  );
}

/**
 * Placeholder neutro para rutas cuyo contenido específico se construye en
 * issues posteriores. Evita crear componentes en `features/` (fuera del
 * alcance de este agente) y permite que el router tenga un elemento renderizable.
 */
function RoutePlaceholder({ label }: { readonly label: string }) {
  return (
    <section
      aria-label={label}
      className="text-ink-500 rounded-xl bg-white/60 p-6 text-sm"
      data-route-placeholder={label}
    >
      {label}
    </section>
  );
}

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    errorElement: <NotFound />,
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
]);

export { DashboardLayout, RoutePlaceholder };
