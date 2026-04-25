import { useCallback, useMemo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  Database,
  GitCompareArrows,
  Layers3,
  Map as MapIcon,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { ActionCards, type ActionCardItem } from '@/components/layout/ActionCards';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ActivityFeed } from '@/features/activity/ActivityFeed';
import { SpainMap } from '@/features/map/SpainMap';
import { HighlightCard } from '@/features/recommendations/HighlightCard';
import { TrendsChart } from '@/features/trends/TrendsChart';
import {
  MAP_LAYER_CATALOG,
  buildLegendStops,
  computeLayerDomain,
  resolveLayer,
  type MapLayerId,
} from '@/features/map/layers/catalog';
import { mockActivity, mockHighlight, mockTrends } from '@/data/mock';
import { NATIONAL_SOURCES, toEnrichedMapPoints } from '@/data/national_mock';
import { computeRanges, scoreMunicipality } from '@/features/escenarios/scoring';
import { useMapLayerStore } from '@/state/mapLayer';
import { useUiStore } from '@/state/ui';
import { DEFAULT_WEIGHTS, useEscenariosStore } from '@/state/escenariosStore';
import { cn } from '@/components/ui/cn';
import { FloatingRanking, MiniMap, RichLegend, TerritorySheet } from '@/features/overlays';

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
    icon: <Activity size={20} strokeWidth={2.25} />,
    accent: 'amber',
    href: '/sparql',
  },
];

/**
 * Banda compacta de KPI por encima del mapa (StatsStrip Atelier).
 *
 * Conserva información sintética para que el contexto del mapa quede
 * resumido sin recurrir a un panel lateral. Los valores se derivan del
 * dataset nacional para mantener la coherencia con el ranking.
 */
interface StatsStripProps {
  readonly territoriesCount: number;
  readonly avgScore: number;
  readonly highlightedName: string;
  readonly highlightedScore: number;
  readonly sourcesCount: number;
  readonly layersCount: number;
}

function StatsStrip({
  territoriesCount,
  avgScore,
  highlightedName,
  highlightedScore,
  sourcesCount,
  layersCount,
}: StatsStripProps) {
  return (
    <ul
      aria-label="Indicadores destacados"
      data-feature="stats-strip"
      className={cn(
        'grid grid-cols-2 gap-2 rounded-2xl border border-[color:var(--color-line-soft)] bg-white/82 p-2.5 backdrop-blur sm:grid-cols-5',
        'shadow-[var(--shadow-card)]'
      )}
    >
      <StatsStripItem
        icon={<Building2 size={16} aria-hidden="true" />}
        label="Municipios"
        value={territoriesCount.toLocaleString('es-ES')}
      />
      <StatsStripItem
        icon={<TrendingUp size={16} aria-hidden="true" />}
        label="Score medio"
        value={avgScore.toFixed(1)}
      />
      <StatsStripItem
        icon={<Sparkles size={16} aria-hidden="true" />}
        label="Mejor encaje"
        value={`${highlightedName} · ${highlightedScore}`}
      />
      <StatsStripItem
        icon={<Database size={16} aria-hidden="true" />}
        label="Fuentes"
        value={`${sourcesCount} datasets`}
      />
      <StatsStripItem
        icon={<Layers3 size={16} aria-hidden="true" />}
        label="Métricas"
        value={`${layersCount} métricas`}
      />
    </ul>
  );
}

function StatsStripItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <li className="flex min-w-0 items-center gap-2 rounded-xl bg-white/95 px-2 py-2 sm:flex-col sm:items-start sm:gap-1.5">
      <span className="bg-brand-50 text-brand-700 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-ink-500 truncate text-[9px] font-semibold tracking-[0.12em] uppercase sm:w-full">
          {label}
        </span>
        <span className="text-ink-900 truncate text-[12px] font-semibold tabular-nums sm:w-full">
          {value}
        </span>
      </span>
    </li>
  );
}

/**
 * Dashboard principal de AtlasHabita en modo Atelier.
 *
 * Refactorizado en M12 para que el mapa pase a ocupar el área principal
 * en pantalla completa y los componentes panelados anteriores se
 * conviertan en overlays:
 *
 *  - Hero compacto con el titular + StatsStrip por encima del mapa.
 *  - Mapa fullscreen (`SpainMap`) con `FloatingRanking`, `RichLegend` y
 *    `MiniMap` solapados como overlays "quiet" (`z-overlay-quiet`).
 *  - Tooltip rico (`MarkerRichTooltip`) y `TerritorySheet` como overlays
 *    "rich" (`z-overlay-rich`).
 *  - Cards de acción inferiores conservadas para mantener el flujo de
 *    navegación principal.
 */
export function DashboardShell() {
  const activeLayerId = useMapLayerStore((state) => state.activeLayerId);
  const setActiveLayer = useMapLayerStore((state) => state.setActiveLayer);
  const weights = useEscenariosStore((state) => state.weights);
  const activeLayer = useMemo(() => resolveLayer(activeLayerId), [activeLayerId]);
  const basePoints = useMemo(() => toEnrichedMapPoints(), []);
  const ranges = useMemo(() => computeRanges(basePoints), [basePoints]);
  const enrichedPoints = useMemo(
    () =>
      basePoints.map((point) => ({
        ...point,
        score: scoreMunicipality(point, weights, ranges),
      })),
    [basePoints, ranges, weights]
  );
  const personalizedScoreActive = useMemo(
    () => JSON.stringify(weights) !== JSON.stringify(DEFAULT_WEIGHTS),
    [weights]
  );

  const selectedTerritoryId = useUiStore((state) => state.selectedTerritoryId);
  const openTerritorySheet = useUiStore((state) => state.openTerritorySheet);
  const closeTerritorySheet = useUiStore((state) => state.closeTerritorySheet);

  const domain = useMemo(
    () => computeLayerDomain(enrichedPoints, activeLayer),
    [enrichedPoints, activeLayer]
  );

  const legendStops = useMemo(() => buildLegendStops(activeLayer, domain), [activeLayer, domain]);
  const sourcesCount = Object.keys(NATIONAL_SOURCES).length;

  const { avgScore, highlight } = useMemo(() => {
    if (enrichedPoints.length === 0) {
      return { avgScore: 0, highlight: { name: 'Sin datos', score: 0 } };
    }
    const total = enrichedPoints.reduce((acc, point) => acc + point.score, 0);
    const top = enrichedPoints.reduce((acc, point) => (point.score > acc.score ? point : acc));
    return {
      avgScore: total / enrichedPoints.length,
      highlight: { name: top.name, score: top.score },
    };
  }, [enrichedPoints]);

  const handleMarkerSelect = useCallback(
    (id: string) => openTerritorySheet(id),
    [openTerritorySheet]
  );

  const handleLayerChange = useCallback(
    (next: MapLayerId) => {
      setActiveLayer(next);
    },
    [setActiveLayer]
  );

  const hero = (
    <section aria-labelledby="dashboard-title" className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-3xl border border-[color:var(--color-line-soft)] bg-white p-5 text-[color:var(--color-ink-900)] shadow-[var(--shadow-card)] sm:p-6">
        <div
          aria-hidden="true"
          className="from-brand-100/70 via-sky-100/55 pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l to-transparent"
        />
        <div
          aria-hidden="true"
          className="bg-brand-200/30 pointer-events-none absolute -top-24 -right-16 h-56 w-56 rounded-full blur-3xl"
        />
        <div className="relative flex flex-col gap-2">
          <h1
            id="dashboard-title"
            className="font-display max-w-3xl text-[22px] leading-[1.12] font-bold sm:text-[26px]"
          >
            Descubre el{' '}
            <span className="text-brand-700 rounded-md bg-[var(--color-brand-50)] px-1.5 py-0.5">
              mejor lugar
            </span>{' '}
            para vivir en España
          </h1>
          <p className="text-ink-600 max-w-xl text-[12.5px] leading-relaxed">
            El score del mapa se recalcula con tu mezcla de indicadores. Ajusta pesos en{' '}
            <Link
              to="/escenarios"
              className="text-brand-700 font-semibold underline decoration-[color:var(--color-brand-200)] underline-offset-4 hover:text-brand-800"
            >
              Escenarios
            </Link>
            , pincha un marcador para abrir su ficha y pulsa <kbd className="font-mono">[</kbd> o{' '}
            <kbd className="font-mono">]</kbd> para cambiar de capa.
          </p>
          <p className="text-brand-700 text-[11px] font-semibold">
            {personalizedScoreActive
              ? 'Mezcla personalizada activa: el ranking y los marcadores ya reflejan tus prioridades.'
              : 'Mezcla equilibrada activa: cambia los pesos para encontrar tu mejor zona.'}
          </p>
        </div>
      </div>

      <StatsStrip
        territoriesCount={enrichedPoints.length}
        avgScore={avgScore}
        highlightedName={highlight.name}
        highlightedScore={highlight.score}
        sourcesCount={sourcesCount}
        layersCount={MAP_LAYER_CATALOG.length}
      />

      <div
        role="radiogroup"
        aria-label="Capa activa del mapa territorial"
        data-feature="dashboard-layer-switcher"
        className="grid grid-cols-[repeat(auto-fit,minmax(108px,1fr))] gap-1.5 rounded-2xl border border-[color:var(--color-line-soft)] bg-white/75 p-2 shadow-[var(--shadow-card)] backdrop-blur"
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
                  ? 'border-brand-300 bg-brand-50 text-ink-900 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl border px-2.5 py-1.5 text-center text-[11px] font-semibold shadow-sm transition-colors'
                  : 'text-ink-600 hover:border-brand-200 hover:bg-brand-50/40 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-2xl border border-[color:var(--color-line-soft)] bg-white px-2.5 py-1.5 text-center text-[11px] font-semibold transition-colors'
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
       * Mapa Atelier: ocupa todo el ancho y tiene los overlays
       * (FloatingRanking, RichLegend, MiniMap) solapados sobre él.
       * `SpainMap` recibe `enrichedTooltip` para que los hovers usen
       * el `MarkerRichTooltip` con sparkline y CTA.
       */}
      <div
        data-feature="atelier-map-stage"
        className="relative h-[min(64vh,620px)] min-h-[390px] overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-line-soft)]"
      >
        <SpainMap
          points={enrichedPoints}
          ariaLabel="Mapa territorial de España con municipios destacados"
          className="h-full"
          layerId={activeLayer.id}
          enrichedTooltip
          hideLegend
          onMarkerSelect={handleMarkerSelect}
        />

        <FloatingRanking forcedExpanded={false} className="hidden xl:flex" />

        <RichLegend
          layer={activeLayer}
          stops={legendStops}
          domain={domain}
          onLayerChange={handleLayerChange}
        />

        <MiniMap className="hidden 2xl:block" />
      </div>
    </section>
  );

  const side = (
    <>
      <HighlightCard highlight={mockHighlight} onOpen={openTerritorySheet} />
      <TrendsChart
        data={mockTrends}
        title="Tendencias territoriales"
        subtitle="Evolución del índice agregado en los municipios destacados."
      />
      <ActivityFeed items={mockActivity.slice(0, 4)} />
    </>
  );

  return (
    <>
      <DashboardLayout
        embedded
        hero={hero}
        side={side}
        footer={<ActionCards items={ACTION_ITEMS} />}
      />
      <TerritorySheet territoryId={selectedTerritoryId} onClose={closeTerritorySheet} />
    </>
  );
}
