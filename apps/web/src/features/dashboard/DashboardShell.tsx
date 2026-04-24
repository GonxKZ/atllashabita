import { useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  GitCompareArrows,
  Map as MapIcon,
  Sparkles,
  Wallet,
  Wifi,
  Wrench,
} from 'lucide-react';
import { ActionCards, type ActionCardItem } from '@/components/layout/ActionCards';
import { ChipFilters, type ChipFilterOption } from '@/components/layout/ChipFilters';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OpportunityIndex } from '@/components/layout/OpportunityIndex';
import { ActivityFeed } from '@/features/activity';
import { HighlightCard } from '@/features/recommendations';
import { SpainMap } from '@/features/map/SpainMap';
import { MAP_LAYER_CATALOG, resolveLayer } from '@/features/map/layers/catalog';
import { TrendsChart } from '@/features/trends';
import { mockActivity, mockHighlight, mockTrends } from '@/data/mock';
import { toEnrichedMapPoints } from '@/data/national_mock';
import { useMapLayerStore } from '@/state/mapLayer';

/**
 * Filtros rápidos del hero. Igualan los chips visibles en la captura
 * `atlashabita-main.png`: Calidad de vida, Vivienda asequible, Empleo,
 * Conectividad y "Más filtros" como afordancia para abrir el panel
 * detallado de scoring.
 */
const CHIP_OPTIONS: ChipFilterOption[] = [
  { id: 'quality', label: 'Calidad de vida', icon: <Sparkles size={14} strokeWidth={2.25} /> },
  { id: 'housing', label: 'Vivienda asequible', icon: <Building2 size={14} strokeWidth={2.25} /> },
  { id: 'jobs', label: 'Empleo', icon: <Wallet size={14} strokeWidth={2.25} /> },
  { id: 'connectivity', label: 'Conectividad', icon: <Wifi size={14} strokeWidth={2.25} /> },
  { id: 'more', label: 'Más filtros', icon: <Wrench size={14} strokeWidth={2.25} /> },
];

/**
 * Cuatro acciones inferiores: igualan la fila final de la captura
 * (Explorar / Recomendar / Comparar / Analizar).
 */
const ACTION_ITEMS: ActionCardItem[] = [
  {
    id: 'explore',
    title: 'Explorar',
    description: 'Recorre el mapa y descubre municipios que encajan con tu perfil.',
    icon: <MapIcon size={20} strokeWidth={2.25} />,
    accent: 'brand',
    href: '/mapa',
  },
  {
    id: 'recommend',
    title: 'Recomendar',
    description: 'Obtén sugerencias personalizadas con explicaciones claras.',
    icon: <Sparkles size={20} strokeWidth={2.25} />,
    accent: 'emerald',
    href: '/ranking',
  },
  {
    id: 'compare',
    title: 'Comparar',
    description: 'Pon dos o más territorios cara a cara con indicadores medibles.',
    icon: <GitCompareArrows size={20} strokeWidth={2.25} />,
    accent: 'sky',
    href: '/comparador',
  },
  {
    id: 'analyze',
    title: 'Analizar',
    description: 'Entra al modo técnico para SPARQL, SHACL y reportes avanzados.',
    icon: <BarChart3 size={20} strokeWidth={2.25} />,
    accent: 'amber',
    href: '/sparql',
  },
];

/**
 * Bounds aproximados de la península y archipiélagos para la previsualización
 * del dashboard. Se proyecta a coordenadas SVG asumiendo un mapa Mercator
 * lineal — es suficientemente preciso para una vista decorativa estática y
 * evita arrastrar `maplibre-gl` (con su dependencia de WebGL/URL.createObjectURL)
 * a la home, donde la prioridad es el render rápido y SSR-friendly de la UI.
 *
 *  La vista interactiva real con react-map-gl + tiles de OpenFreeMap se sigue
 *  ofreciendo en `/mapa` (ver `routes/AppRouter.tsx`); aquí mostramos una
 *  versión estática pixel-perfect del comp `atlashabita-main.png`.
 */
// La home renderiza ahora el componente `SpainMap` interactivo (MapLibre +
// OpenFreeMap). En entornos jsdom (vitest) el mock de `vitest.setup.ts`
// devuelve un wrapper accesible para que los tests sigan siendo deterministas.

/**
 * Dashboard principal de AtlasHabita.
 *
 * Compone Sidebar + Topbar + bloque hero + mapa + panel lateral derecho
 * (recomendación / tendencias / actividad) + acciones inferiores. El
 * layout sigue pixel-perfect la captura `atlashabita-main.png`:
 *
 *  - Hero verde con gradiente y la palabra "mejor lugar" resaltada.
 *  - Chips de filtros sobre el hero, variante `onBrand`.
 *  - Mapa estático (SVG) con marcadores burbuja verdes; bajo él, índice de
 *    oportunidad. La versión interactiva con maplibre se accede en `/mapa`.
 *  - Panel lateral con HighlightCard, TrendsChart y ActivityFeed reales
 *    tomando datos de `data/mock.ts`.
 *  - Cards de acción inferiores con iconografía y acentos distintos.
 */
export function DashboardShell() {
  const [activeChips, setActiveChips] = useState<string[]>(['quality']);
  const activeLayerId = useMapLayerStore((state) => state.activeLayerId);
  const setActiveLayer = useMapLayerStore((state) => state.setActiveLayer);
  const activeLayer = useMemo(() => resolveLayer(activeLayerId), [activeLayerId]);
  const enrichedPoints = useMemo(() => toEnrichedMapPoints(), []);

  const hero = useMemo(
    () => (
      <section aria-labelledby="dashboard-title" className="flex flex-col gap-5">
        {/*
         * Banner verde del comp: gradiente diagonal con la palabra "mejor
         * lugar" en blanco brillante. Las dos burbujas blancas suavizadas
         * imitan el "glow" de la captura.
         */}
        <div className="from-brand-500 via-brand-500 to-brand-600 relative overflow-hidden rounded-3xl bg-gradient-to-br p-7 text-white shadow-[var(--shadow-elevated)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl"
          />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-2.5">
              <h1
                id="dashboard-title"
                className="font-display max-w-3xl text-[28px] leading-[1.15] font-bold sm:text-[34px]"
              >
                Descubre el{' '}
                <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-white">mejor lugar</span>{' '}
                para vivir en España
              </h1>
              <p className="max-w-xl text-[14px] leading-relaxed text-white/85">
                Explora, compara y encuentra tu lugar ideal con datos abiertos y tecnología
                semántica.
              </p>
            </div>
            <ChipFilters
              options={CHIP_OPTIONS}
              value={activeChips}
              tone="onBrand"
              onToggle={(id) =>
                setActiveChips((prev) =>
                  prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                )
              }
            />
          </div>
        </div>

        {/*
         * Mini LayerSwitcher en formato chip-row para alternar la métrica
         * que colorea el mapa sin abandonar la home. La fila es scrollable
         * en horizontal en pantallas estrechas y comparte el mismo store
         * que `/mapa`, por lo que la elección persiste entre rutas.
         */}
        <div
          role="radiogroup"
          aria-label="Capa activa del mapa territorial"
          data-feature="dashboard-layer-switcher"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {MAP_LAYER_CATALOG.map((layer) => {
            const isActive = layer.id === activeLayer.id;
            return (
              <button
                key={layer.id}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => setActiveLayer(layer.id)}
                data-active={isActive ? 'true' : 'false'}
                className={
                  isActive
                    ? 'border-brand-300 bg-brand-50 text-ink-900 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors'
                    : 'text-ink-500 hover:border-brand-200 hover:bg-brand-50/40 inline-flex items-center gap-2 rounded-full border border-[color:var(--color-line-soft)] bg-white px-3 py-1.5 text-xs font-semibold transition-colors'
                }
              >
                <span
                  aria-hidden="true"
                  className="block h-2 w-2 rounded-full"
                  style={{ backgroundColor: layer.palette[0] }}
                />
                {layer.label}
              </button>
            );
          })}
        </div>

        {/*
         * Mapa interactivo MapLibre con tiles reales (OpenFreeMap Liberty).
         * En entornos jsdom (vitest) `vitest.setup.ts` mockea `maplibre-gl`
         * para evitar `URL.createObjectURL`, lo cual deja el árbol DOM
         * estable durante los tests.
         */}
        <div className="relative h-[400px] overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-line-soft)]">
          <SpainMap
            points={enrichedPoints}
            ariaLabel="Mapa territorial de España con municipios destacados"
            className="h-full"
            layerId={activeLayer.id}
          />
        </div>

        <OpportunityIndex
          value={74}
          description="Resumen agregado de los territorios filtrados con tu selección actual."
        />
      </section>
    ),
    [activeChips, activeLayer.id, enrichedPoints, setActiveLayer]
  );

  /*
   * Panel lateral derecho: tres cards apiladas que reproducen exactamente
   * el orden de la captura — Recomendación destacada (con foto), Tendencias
   * (sparkline verde) y Actividad reciente (timeline con iconos circulares).
   */
  const side = (
    <>
      <HighlightCard highlight={mockHighlight} />
      <TrendsChart
        data={mockTrends}
        title="Tendencias"
        subtitle="Score medio de los últimos 12 meses."
      />
      <ActivityFeed items={mockActivity.slice(0, 3)} title="Actividad reciente" />
    </>
  );

  return (
    <DashboardLayout
      embedded
      hero={hero}
      side={side}
      footer={<ActionCards items={ACTION_ITEMS} />}
    />
  );
}
