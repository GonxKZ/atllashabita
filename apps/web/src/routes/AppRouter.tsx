/**
 * Configuración de enrutado global con React Router v7.
 *
 * El layout raíz monta una sola vez el Sidebar y el Topbar y delega el
 * contenido principal al `<Outlet />`. Cada ruta decide qué pantalla mostrar:
 *
 *  - `/`           → `DashboardShell` con hero, mapa real, panel derecho y CTAs.
 *  - `/mapa`       → `MapPage` a página completa con MapLibre y filtros.
 *  - `/ranking`    → `RankingPanel` paginado.
 *  - `/recomendador` → alias de `/ranking`.
 *  - `/comparador` → comparador territorial (placeholder estructurado).
 *  - `/territorio/:id` → `TerritoryDetail` (Sevilla, etc.).
 *  - `/escenarios` → alias del playground SPARQL.
 *  - `/sparql`     → `SparqlPlayground` lazy-loaded.
 *  - `*`           → `NotFound`.
 *
 * Crítico: ya no se renderiza `DashboardShell` por encima del `<Outlet />`,
 * lo cual antes hacía que cada ruta interna mostrase también el dashboard.
 */

import { Suspense, lazy } from 'react';
import { createBrowserRouter, Outlet, useNavigate } from 'react-router-dom';

import { DashboardShell } from '../features/dashboard/DashboardShell';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { NotFound } from './NotFound';
import { RankingPanel } from '../features/ranking';
import { TerritoryDetail } from '../features/territory';

const LazySparqlPlayground = lazy(() =>
  import('../features/sparql/SparqlPlayground').then((module) => ({
    default: module.SparqlPlayground,
  }))
);

const LazyMapPage = lazy(() =>
  import('../features/map/MapPage').then((module) => ({ default: module.MapPage }))
);

/**
 * Layout principal: chroma + sidebar fija + topbar pegajosa + contenido.
 *
 * El topbar conecta su buscador y el botón "Nuevo análisis" con el router para
 * que toda navegación pase por React Router (no anchor scroll).
 */
function RootLayout() {
  const navigate = useNavigate();
  return (
    <div className="bg-surface-soft text-ink-900 flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar
          onSearch={(q) => {
            const term = q.trim();
            if (term) {
              navigate(`/ranking?q=${encodeURIComponent(term)}`);
            }
          }}
          onFeedback={() =>
            window.open('mailto:licitaciones@gpic.es?subject=Feedback%20AtlasHabita')
          }
          onNewAnalysis={() => navigate('/sparql')}
        />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function HomeRoute() {
  return <DashboardShell />;
}

function ComparadorRoute() {
  return (
    <section
      aria-label="Comparador"
      className="mx-auto w-full max-w-6xl px-8 py-8"
      data-route="comparador"
    >
      <header className="mb-6">
        <h1 className="font-display text-ink-900 text-2xl font-semibold tracking-tight">
          Comparador territorial
        </h1>
        <p className="text-ink-500 mt-1 text-sm">
          Selecciona dos o más territorios para comparar indicadores normalizados con sus
          contribuciones al score y la procedencia de cada dato.
        </p>
      </header>
      <RankingPanel />
    </section>
  );
}

function SparqlRoute() {
  return (
    <section aria-label="sparql" className="mx-auto w-full max-w-6xl px-8 py-8" data-route="sparql">
      <header className="mb-6">
        <h1 className="font-display text-ink-900 text-2xl font-semibold tracking-tight">
          Panel técnico SPARQL
        </h1>
        <p className="text-ink-500 mt-1 text-sm">
          Catálogo controlado de consultas sobre el grafo RDF. Las claves se validan en cliente
          antes de enviarse al backend.
        </p>
      </header>
      <Suspense
        fallback={
          <div
            className="text-ink-500 rounded-3xl bg-white/70 p-8 text-sm shadow-[var(--shadow-card)]"
            role="status"
            aria-live="polite"
          >
            Cargando playground SPARQL…
          </div>
        }
      >
        <LazySparqlPlayground />
      </Suspense>
    </section>
  );
}

function MapaRoute() {
  return (
    <section aria-label="mapa" className="mx-auto w-full max-w-7xl px-8 py-8" data-route="mapa">
      <header className="mb-6">
        <h1 className="font-display text-ink-900 text-2xl font-semibold tracking-tight">
          Explorar mapa
        </h1>
        <p className="text-ink-500 mt-1 text-sm">
          Vista geoespacial de los municipios cubiertos por AtlasHabita con tiles reales de
          OpenFreeMap.
        </p>
      </header>
      <Suspense
        fallback={
          <div
            className="h-[600px] rounded-3xl bg-white shadow-[var(--shadow-card)]"
            role="status"
            aria-busy="true"
          />
        }
      >
        <LazyMapPage />
      </Suspense>
    </section>
  );
}

function RankingRoute() {
  return (
    <section
      aria-label="ranking"
      className="mx-auto w-full max-w-6xl px-8 py-8"
      data-route="ranking"
    >
      <header className="mb-6">
        <h1 className="font-display text-ink-900 text-2xl font-semibold tracking-tight">
          Ranking nacional
        </h1>
        <p className="text-ink-500 mt-1 text-sm">
          Resultados ordenados por puntuación con filtros duros, paginación y enlace a la ficha
          completa de cada municipio.
        </p>
      </header>
      <RankingPanel />
    </section>
  );
}

function TerritoryRoute() {
  return (
    <section
      aria-label="territorio"
      className="mx-auto w-full max-w-5xl px-8 py-8"
      data-route="territorio"
    >
      <TerritoryDetail />
    </section>
  );
}

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <HomeRoute /> },
      { path: 'mapa', element: <MapaRoute /> },
      { path: 'recomendador', element: <RankingRoute /> },
      { path: 'ranking', element: <RankingRoute /> },
      { path: 'comparador', element: <ComparadorRoute /> },
      { path: 'escenarios', element: <SparqlRoute /> },
      { path: 'territorio/:id', element: <TerritoryRoute /> },
      { path: 'sparql', element: <SparqlRoute /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

export {
  RootLayout,
  HomeRoute,
  ComparadorRoute,
  RankingRoute,
  TerritoryRoute,
  SparqlRoute,
  MapaRoute,
};
