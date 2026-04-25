/**
 * MarkerRichTooltip — tooltip enriquecido para marcadores del Atelier.
 *
 * Sustituye al tooltip clásico (`MapTooltip`) cuando se quiere mostrar el
 * detalle al pasar sobre un marcador en modo Atelier. Aporta:
 *
 *  - Sparkline 12 meses (SVG inline) generada a partir de un seed
 *    determinista basado en el id del municipio para que la UI sea
 *    estable entre renders.
 *  - Top-3 indicadores con destacado visual del activo.
 *  - CTA "Ver ficha" que invoca el callback `onOpenSheet`.
 *
 * El componente es controlado por sus props (`x`, `y`, `marker`); no
 * gestiona montaje/desmontaje. Se posiciona en `position: absolute`
 * sobre el contenedor del mapa.
 */

import { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/components/ui/cn';

export interface MarkerRichTooltipIndicator {
  readonly id: string;
  readonly label: string;
  readonly value: number;
  readonly unit: string;
}

export interface MarkerRichTooltipMarker {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly value: number;
  readonly province?: string;
  readonly indicators?: readonly MarkerRichTooltipIndicator[];
}

export interface MarkerRichTooltipProps {
  /** Datos del marcador resaltado. */
  readonly marker: MarkerRichTooltipMarker;
  /** Coordenada X dentro del contenedor. */
  readonly x: number;
  /** Coordenada Y dentro del contenedor. */
  readonly y: number;
  /** Etiqueta de la capa activa. */
  readonly layerLabel: string;
  /** Sufijo de unidad de la capa activa. */
  readonly unit: string;
  /** ID del indicador asociado a la capa activa (resalta el item top-3). */
  readonly activeIndicatorId?: string;
  /** Callback al pulsar "Ver ficha". */
  readonly onOpenSheet?: (id: string) => void;
}

const SPARKLINE_WIDTH = 160;
const SPARKLINE_HEIGHT = 36;
const SPARKLINE_MONTHS = 12;

/**
 * Generador determinista basado en una string. Devuelve siempre la misma
 * secuencia de valores para el mismo `id`, lo que garantiza un render
 * estable y testeable de la sparkline.
 */
function buildSparkline(seed: string, baseline: number): readonly number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const values: number[] = [];
  for (let i = 0; i < SPARKLINE_MONTHS; i += 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    // Normaliza a [-1, 1] y aplica una amplitud relativa al baseline.
    const noise = ((hash & 0xffff) / 0xffff) * 2 - 1;
    const oscillation = Math.sin((i / SPARKLINE_MONTHS) * Math.PI * 2);
    const amplitude = Math.max(2, Math.abs(baseline) * 0.05);
    values.push(baseline + (oscillation * 0.6 + noise * 0.4) * amplitude);
  }
  return values;
}

function buildPath(values: readonly number[]): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = SPARKLINE_WIDTH / (values.length - 1 || 1);
  return values
    .map((value, index) => {
      const x = index * step;
      const y = SPARKLINE_HEIGHT - ((value - min) / span) * SPARKLINE_HEIGHT;
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

function formatValue(value: number, unit: string): string {
  const trimmed = unit.trim();
  const formatted = Number.isInteger(value)
    ? value.toLocaleString('es-ES')
    : value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  if (!trimmed) return formatted;
  if (/^[€%°]/.test(trimmed)) return `${formatted}${trimmed}`;
  return `${formatted} ${trimmed}`;
}

function pickTop(
  indicators: readonly MarkerRichTooltipIndicator[] | undefined,
  activeId: string | undefined
) {
  if (!indicators || indicators.length === 0) return [];
  const active = activeId ? indicators.find((entry) => entry.id === activeId) : undefined;
  const rest = indicators.filter((entry) => entry.id !== active?.id);
  // Ordenamos el resto por valor descendente (siempre sobre el mismo id, sin
  // romper si los datasets crecen) y tomamos los dos mejores.
  const sortedRest = [...rest].sort((a, b) => b.value - a.value).slice(0, active ? 2 : 3);
  return [...(active ? [active] : []), ...sortedRest].slice(0, 3);
}

export function MarkerRichTooltip({
  marker,
  x,
  y,
  layerLabel,
  unit,
  activeIndicatorId,
  onOpenSheet,
}: MarkerRichTooltipProps) {
  const sparklineValues = useMemo(
    () => buildSparkline(marker.id, marker.score),
    [marker.id, marker.score]
  );
  const sparklinePath = useMemo(() => buildPath(sparklineValues), [sparklineValues]);
  const topIndicators = useMemo(
    () => pickTop(marker.indicators, activeIndicatorId),
    [marker.indicators, activeIndicatorId]
  );

  return (
    <div
      role="tooltip"
      data-testid="marker-rich-tooltip"
      data-feature="marker-rich-tooltip"
      className={cn(
        'pointer-events-auto absolute min-w-[260px] -translate-x-1/2 -translate-y-full overflow-hidden rounded-2xl',
        'border border-white/15 bg-[var(--color-ink-900)]/95 text-white shadow-[var(--shadow-elevated)] backdrop-blur'
      )}
      style={{ left: x, top: y - 14, zIndex: 'var(--z-overlay-rich)' as unknown as number }}
    >
      <div className="flex items-start justify-between gap-3 px-3 pt-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--color-brand-200)] uppercase">
            Territorio
          </p>
          <p className="mt-0.5 truncate text-sm leading-tight font-semibold">{marker.name}</p>
          {marker.province ? (
            <p className="truncate text-[11px] leading-tight text-white/60">{marker.province}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-[10px] tracking-wide text-white/50 uppercase">Score</p>
          <p
            className="text-2xl leading-none font-bold tabular-nums"
            data-testid="marker-rich-tooltip-score"
          >
            {marker.score}
          </p>
        </div>
      </div>

      <div className="mt-3 px-3">
        <p className="text-[10px] font-semibold tracking-[0.16em] text-white/40 uppercase">
          {layerLabel} · 12 meses
        </p>
        <svg
          aria-hidden="true"
          viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
          width="100%"
          height={SPARKLINE_HEIGHT}
          className="mt-1 block"
          data-testid="marker-rich-tooltip-sparkline"
        >
          <defs>
            <linearGradient id={`sparkline-fill-${marker.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-brand-300)" stopOpacity={0.55} />
              <stop offset="100%" stopColor="var(--color-brand-300)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path
            d={`${sparklinePath} L${SPARKLINE_WIDTH},${SPARKLINE_HEIGHT} L0,${SPARKLINE_HEIGHT} Z`}
            fill={`url(#sparkline-fill-${marker.id})`}
          />
          <path
            d={sparklinePath}
            fill="none"
            stroke="var(--color-brand-200)"
            strokeWidth={1.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
        <p className="text-right text-[10px] text-white/60 tabular-nums">
          Valor actual: {formatValue(marker.value, unit)}
        </p>
      </div>

      {topIndicators.length > 0 ? (
        <ul
          data-testid="marker-rich-tooltip-top"
          className="mt-3 grid grid-cols-1 gap-1 px-3 text-[11px]"
        >
          {topIndicators.map((indicator) => {
            const isActive = indicator.id === activeIndicatorId;
            return (
              <li
                key={indicator.id}
                data-active={isActive ? 'true' : 'false'}
                className={cn(
                  'flex items-baseline justify-between gap-3 rounded-md px-2 py-1',
                  isActive ? 'bg-white/15 font-semibold text-white' : 'text-white/75'
                )}
              >
                <span className="truncate">{indicator.label}</span>
                <span className="shrink-0 tabular-nums">
                  {formatValue(indicator.value, indicator.unit)}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 bg-white/5 px-3 py-2">
        <span className="text-[10px] text-white/55">
          Pinchar en el mapa para abrir la ficha del municipio.
        </span>
        <button
          type="button"
          onClick={() => onOpenSheet?.(marker.id)}
          data-testid="marker-rich-tooltip-cta"
          className={cn(
            'bg-brand-500 hover:bg-brand-600 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-white transition-colors',
            'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-ink-900)] focus-visible:outline-none'
          )}
        >
          Ver ficha
          <ArrowUpRight size={12} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
