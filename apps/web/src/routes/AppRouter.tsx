/* eslint-disable no-undef -- HTMLInputElement es tipo DOM global resuelto por TypeScript. */
/**
 * Configuración de enrutado global con React Router v7.
 *
 * El layout raíz monta una sola vez el Sidebar, el Topbar y la paleta de
 * comandos. Cada ruta decide qué pantalla mostrar a través del `<Outlet />`:
 *
 *  - `/`              → `DashboardShell` con hero, mapa real y panel derecho.
 *  - `/mapa`          → `MapPage` a pantalla completa con MapLibre.
 *  - `/ranking`       → `RankingPanel` paginado.
 *  - `/recomendador`  → alias de `/ranking`.
 *  - `/comparador`    → `ComparadorPage` real con drag & drop.
 *  - `/escenarios`    → `EscenariosPage` real con simulador de pesos.
 *  - `/territorio/:id`→ `TerritoryDetail`.
 *  - `/sparql`        → `SparqlPlayground` lazy-loaded.
 *  - `/login`         → `LoginPage` (sin chrome).
 *  - `/registro`      → `RegisterPage` (sin chrome).
 *  - `/cuenta`        → `AccountPage` protegida con `RequireAuth`.
 *  - `*`              → `NotFound`.
 *
 * El `RootLayout` es el responsable de orquestar la `CommandPalette` (⌘K)
 * y el panel de atajos. Los toggles de UI (sidebar, leyenda, mini-mapa) se
 * gestionan en estado local porque no requieren persistencia entre rutas.
 */

import { Suspense, lazy, useCallback, useState } from 'react';
import { createBrowserRouter, Outlet, useNavigate } from 'react-router-dom';

import { DashboardShell } from '../features/dashboard/DashboardShell';
import { Sidebar } from '../components/layout/Sidebar';
import { Topbar } from '../components/layout/Topbar';
import { NotFound } from './NotFound';
import { RankingPanel } from '../features/ranking';
import { TerritoryDetail } from '../features/territory';
import { AccountPage } from '../features/auth/AccountPage';
import { LoginPage } from '../features/auth/LoginPage';
import { RegisterPage } from '../features/auth/RegisterPage';
import { RequireAuth } from '../features/auth/RequireAuth';
import { ComparadorPage } from '../features/comparador/ComparadorPage';
import { EscenariosPage } from '../features/escenarios/EscenariosPage';
import { CommandPalette } from '../features/command/CommandPalette';
import { useShortcuts } from '../features/command/useShortcuts';
import { COMMAND_LAYER_OPTIONS } from '../features/command/items';
import { useMapLayerStore } from '../state/mapLayer';
import { HelpKey } from '../components/ui/HelpKey';
import { cn } from '../components/ui/cn';

const LazySparqlPlayground = lazy(() =>
  import('../features/sparql/SparqlPlayground').then((module) => ({
    default: module.SparqlPlayground,
  }))
);

const LazyMapPage = lazy(() =>
  import('../features/map/MapPage').then((module) => ({ default: module.MapPage }))
);

/**
 * Layout principal con shortcuts y paleta global.
 *
 * Mantiene en estado local la visibilidad de la sidebar, la leyenda y el
 * mini-mapa; los componentes hijos pueden consumir esos toggles vía CSS o
 * props si lo necesitan más adelante. Por ahora el efecto observable es:
 *
 *   - El layout colapsa la sidebar al pulsar ⌘B.
 *   - La paleta abre con ⌘K y se cierra con Esc.
 *   - El panel `Atajos` se monta cuando el usuario pulsa `?`.
 */
function RootLayout() {
  const navigate = useNavigate();
  const setActiveLayer = useMapLayerStore((state) => state.setActiveLayer);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [legendVisible, setLegendVisible] = useState(true);
  const [miniMapVisible, setMiniMapVisible] = useState(true);

  const focusTopbarSearch = useCallback(() => {
    if (typeof document === 'undefined') return;
    const input = document.querySelector<HTMLInputElement>(
      'header[role="banner"] input[type="search"], header input[type="search"]'
    );
    input?.focus();
    input?.select();
  }, []);

  const handleSelectLayer = useCallback(
    (index: number) => {
      const target = COMMAND_LAYER_OPTIONS[index - 1];
      if (target) setActiveLayer(target.id);
    },
    [setActiveLayer]
  );

  useShortcuts({
    onTogglePalette: () => setPaletteOpen((open) => !open),
    onToggleSidebar: () => setSidebarVisible((visible) => !visible),
    onToggleLegend: () => setLegendVisible((visible) => !visible),
    onToggleMiniMap: () => setMiniMapVisible((visible) => !visible),
    onSelectLayer: handleSelectLayer,
    onFocusSearch: focusTopbarSearch,
    onShowShortcuts: () => setShortcutsOpen(true),
    onEscape: () => {
      if (paletteOpen) setPaletteOpen(false);
      else if (shortcutsOpen) setShortcutsOpen(false);
    },
  });

  return (
    <div
      className="bg-surface-soft text-ink-900 flex min-h-screen"
      data-sidebar-visible={sidebarVisible}
      data-legend-visible={legendVisible}
      data-minimap-visible={miniMapVisible}
    >
      <div
        className={cn(
          'transition-all duration-200 ease-out',
          sidebarVisible ? 'w-72' : 'w-0 overflow-hidden'
        )}
        aria-hidden={!sidebarVisible}
      >
        <Sidebar />
      </div>
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
          extra={
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              aria-label="Abrir paleta de comandos"
              className="text-ink-700 hover:border-brand-300 hover:text-brand-700 hidden h-10 items-center gap-2 rounded-full border border-[color:var(--color-line-soft)] bg-white px-3 text-xs transition-colors sm:inline-flex"
            >
              <span className="font-medium">Buscar acciones</span>
              <HelpKey>Ctrl</HelpKey>
              <HelpKey>K</HelpKey>
            </button>
          }
        />
        <main id="main-content" tabIndex={-1} className="flex-1 focus-visible:outline-none">
          <Outlet />
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onShowShortcuts={() => {
          setShortcutsOpen(true);
          setPaletteOpen(false);
        }}
        onToggleSidebar={() => setSidebarVisible((visible) => !visible)}
        onToggleLegend={() => setLegendVisible((visible) => !visible)}
        onToggleMiniMap={() => setMiniMapVisible((visible) => !visible)}
        onFocusSearch={focusTopbarSearch}
      />

      {shortcutsOpen ? <ShortcutsHelp onClose={() => setShortcutsOpen(false)} /> : null}
    </div>
  );
}

interface ShortcutsHelpProps {
  readonly onClose: () => void;
}

const SHORTCUT_GROUPS: ReadonlyArray<{
  readonly title: string;
  readonly entries: ReadonlyArray<{
    readonly keys: readonly string[];
    readonly description: string;
  }>;
}> = [
  {
    title: 'Navegación',
    entries: [
      { keys: ['Ctrl', 'K'], description: 'Abrir o cerrar la paleta de comandos' },
      { keys: ['/'], description: 'Foco en el buscador del topbar' },
      { keys: ['?'], description: 'Mostrar este panel de atajos' },
      { keys: ['Esc'], description: 'Cerrar overlays activos' },
    ],
  },
  {
    title: 'Vistas',
    entries: [
      { keys: ['Ctrl', 'B'], description: 'Mostrar / ocultar barra lateral' },
      { keys: ['Ctrl', 'L'], description: 'Mostrar / ocultar leyenda del mapa' },
      { keys: ['Ctrl', 'M'], description: 'Mostrar / ocultar mini-mapa' },
    ],
  },
  {
    title: 'Capas del mapa',
    entries: [
      { keys: ['Ctrl', '1'], description: 'Activar capa principal' },
      { keys: ['Ctrl', '2'], description: 'Capa secundaria' },
      { keys: ['Ctrl', '3..9'], description: 'Resto de capas en orden' },
    ],
  },
];

function ShortcutsHelp({ onClose }: ShortcutsHelpProps) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center px-4">
      <button
        type="button"
        className="bg-ink-900/40 absolute inset-0 backdrop-blur-md"
        aria-label="Cerrar atajos"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Atajos disponibles"
        className="relative z-10 w-full max-w-xl rounded-3xl border border-[color:var(--color-line-soft)] bg-white p-6 shadow-[0_30px_80px_-30px_rgba(15,23,42,0.45)]"
      >
        <header className="mb-4">
          <h2 className="font-display text-ink-900 text-lg font-semibold tracking-tight">
            Atajos rápidos
          </h2>
          <p className="text-ink-500 text-xs">
            Pulsa <HelpKey>Esc</HelpKey> para volver. Estos atajos funcionan en cualquier página.
          </p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          {SHORTCUT_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="text-ink-500 mb-2 text-[11px] font-semibold tracking-[0.16em] uppercase">
                {group.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {group.entries.map((entry) => (
                  <li
                    key={entry.description}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-ink-700">{entry.description}</span>
                    <span className="inline-flex items-center gap-1">
                      {entry.keys.map((key) => (
                        <HelpKey key={`${entry.description}-${key}`}>{key}</HelpKey>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function HomeRoute() {
  return <DashboardShell />;
}

function ComparadorRoute() {
  return <ComparadorPage />;
}

function EscenariosRoute() {
  return <EscenariosPage />;
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

function CuentaRoute() {
  return (
    <RequireAuth>
      <AccountPage />
    </RequireAuth>
  );
}

export const appRouter = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/registro', element: <RegisterPage /> },
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
      { path: 'escenarios', element: <EscenariosRoute /> },
      { path: 'territorio/:id', element: <TerritoryRoute /> },
      { path: 'sparql', element: <SparqlRoute /> },
      { path: 'cuenta', element: <CuentaRoute /> },
    ],
  },
  { path: '*', element: <NotFound /> },
]);

export {
  RootLayout,
  HomeRoute,
  ComparadorRoute,
  EscenariosRoute,
  RankingRoute,
  TerritoryRoute,
  SparqlRoute,
  MapaRoute,
  CuentaRoute,
};
