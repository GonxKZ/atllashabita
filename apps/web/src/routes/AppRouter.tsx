/**
 * Configuración de enrutado global con React Router v7.
 *
 * Se usa `createBrowserRouter` + `RouterProvider` para permitir splitting y
 * futuros `loader`/`action`. Todas las rutas internas comparten `DashboardShell`
 * como layout y exponen un `<Outlet />` donde se monta el contenido de cada
 * pantalla (mapa, recomendador, comparador, escenarios, ficha territorial).
 *
 * La Fase D (v0.2.0) incorpora tres rutas de producto con feature flags propias:
 *   - `/ranking`: panel nacional con filtros duros y paginación.
 *   - `/territorio/:id`: ficha territorial completa con PROV-O y "Ver RDF".
 *   - `/sparql`: panel técnico con catálogo y ejecutor. Se carga vía
 *     `React.lazy` para mantener el bundle inicial por debajo del presupuesto
 *     establecido en `docs/roadmap.md`.
 */

import { createBrowserRouter, Outlet } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { DashboardShell } from '../features/dashboard/DashboardShell';
import { NotFound } from './NotFound';
import { RankingPanel } from '../features/ranking';
import { TerritoryDetail } from '../features/territory';

const LazySparqlPlayground = lazy(() =>
  import('../features/sparql/SparqlPlayground').then((module) => ({
    default: module.SparqlPlayground,
  }))
);

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

function SparqlRoute() {
  return (
    <section aria-label="sparql" className="mx-auto w-full max-w-5xl px-8 py-6" data-route="sparql">
      <Suspense fallback={<RoutePlaceholder label="cargando panel SPARQL" />}>
        <LazySparqlPlayground />
      </Suspense>
    </section>
  );
}

function RankingRoute() {
  return (
    <section
      aria-label="ranking"
      className="mx-auto w-full max-w-5xl px-8 py-6"
      data-route="ranking"
    >
      <RankingPanel />
    </section>
  );
}

function TerritoryRoute() {
  return (
    <section
      aria-label="territorio"
      className="mx-auto w-full max-w-5xl px-8 py-6"
      data-route="territorio"
    >
      <TerritoryDetail />
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
      { path: 'ranking', element: <RankingRoute /> },
      { path: 'territorio/:id', element: <TerritoryRoute /> },
      { path: 'sparql', element: <SparqlRoute /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

export { DashboardLayout, RoutePlaceholder, RankingRoute, TerritoryRoute, SparqlRoute };
