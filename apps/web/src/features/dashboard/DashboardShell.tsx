import { useCallback, useMemo, type ReactNode } from 'react';
import {
  Activity,
  Building2,
  GitCompareArrows,
  Map as MapIcon,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { ActionCards, type ActionCardItem } from '@/components/layout/ActionCards';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SpainMap } from '@/features/map/SpainMap';
import {
  MAP_LAYER_CATALOG,
  buildLegendStops,
  computeLayerDomain,
  resolveLayer,
  type MapLayerId,
} from '@/features/map/layers/catalog';
import { toEnrichedMapPoints } from '@/data/national_mock';
import { useMapLayerStore } from '@/state/mapLayer';
import { useUiStore } from '@/state/ui';
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
}

function StatsStrip({
  territoriesCount,
  avgScore,
  highlightedName,
  highlightedScore,
}: StatsStripProps) {
  return (
    <ul
      aria-label="Indicadores destacados"
      data-feature="stats-strip"
      className={cn(
        'flex flex-wrap items-stretch gap-3 rounded-2xl border border-[color:var(--color-line-soft)] bg-white/80 p-3 backdrop-blur',
        'shadow-[var(--shadow-card)]'
      )}
    >
      <StatsStripItem
        icon={<Building2 size={16} aria-hidden="true" />}
        label="Municipios analizados"
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
    </ul>
  );
}

function StatsStripItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <li className="flex min-w-[160px] flex-1 items-center gap-3 rounded-xl bg-white/95 px-3 py-2">
      <span className="bg-brand-50 text-brand-700 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-ink-500 text-[10px] font-semibold tracking-[0.16em] uppercase">
          {label}
        </span>
        <span className="text-ink-900 truncate text-sm font-semibold tabular-nums">{value}</span>
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
  const activeLayer = useMemo(() => resolveLayer(activeLayerId), [activeLayerId]);
  const enrichedPoints = useMemo(() => toEnrichedMapPoints(), []);

  const selectedTerritoryId = useUiStore((state) => state.selectedTerritoryId);
  const openTerritorySheet = useUiStore((state) => state.openTerritorySheet);
  const closeTerritorySheet = useUiStore((state) => state.closeTerritorySheet);

  const domain = useMemo(
    () => computeLayerDomain(enrichedPoints, activeLayer),
    [enrichedPoints, activeLayer]
  );

  const legendStops = useMemo(() => buildLegendStops(activeLayer, domain), [activeLayer, domain]);

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
    <section aria-labelledby="dashboard-title" className="flex flex-col gap-4">
      <div className="from-brand-500 via-brand-500 to-brand-600 relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-[var(--shadow-elevated)] sm:p-7">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-white/25 blur-3xl"
        />
        <div className="relative flex flex-col gap-2">
          <h1
            id="dashboard-title"
            className="font-display max-w-3xl text-[24px] leading-[1.15] font-bold sm:text-[28px]"
          >
            Descubre el{' '}
            <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-white">mejor lugar</span>{' '}
            para vivir en España
          </h1>
          <p className="max-w-xl text-[13px] leading-relaxed text-white/85">
            Pinchar en el mapa para abrir la ficha del municipio. Pulsa{' '}
            <kbd className="font-mono">[</kbd> o <kbd className="font-mono">]</kbd> para cambiar de
            capa.
          </p>
        </div>
      </div>

      <StatsStrip
        territoriesCount={enrichedPoints.length}
        avgScore={avgScore}
        highlightedName={highlight.name}
        highlightedScore={highlight.score}
      />

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
       * Mapa Atelier: ocupa todo el ancho y tiene los overlays
       * (FloatingRanking, RichLegend, MiniMap) solapados sobre él.
       * `SpainMap` recibe `enrichedTooltip` para que los hovers usen
       * el `MarkerRichTooltip` con sparkline y CTA.
       */}
      <div
        data-feature="atelier-map-stage"
        className="relative h-[min(70vh,720px)] min-h-[420px] overflow-hidden rounded-3xl bg-white shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-line-soft)]"
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

        <FloatingRanking />

        <RichLegend
          layer={activeLayer}
          stops={legendStops}
          domain={domain}
          onLayerChange={handleLayerChange}
        />

        <MiniMap />
      </div>
    </section>
  );

  return (
    <>
      <DashboardLayout embedded hero={hero} footer={<ActionCards items={ACTION_ITEMS} />} />
      <TerritorySheet territoryId={selectedTerritoryId} onClose={closeTerritorySheet} />
    </>
  );
}
