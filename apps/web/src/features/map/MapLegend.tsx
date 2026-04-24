/**
 * Leyenda cromática dinámica para el mapa multi-métrica.
 *
 * Refleja la rampa de la capa activa con sus tramos y unidades reales,
 * permitiendo que el usuario interprete el color de cada burbuja sin
 * depender exclusivamente de la cromática (cumpliendo WCAG 1.4.1 sobre uso
 * del color y la guía interna documentada en
 * docs/16_FRONTEND_UX_UI_Y_FLUJOS.md §8).
 *
 * El componente se mantiene cobertor de la API original (`label`, `stops`,
 * `unit`) para no romper consumidores existentes, y añade capacidades nuevas:
 *  - `description`: texto corto explicativo de la capa.
 *  - `domain`: dominio observado para reforzar el rango.
 *  - `unit` ahora se proyecta como un sufijo neutro (sin espacios) que el
 *    componente formatea junto a los valores con la convención local.
 */

export interface MapLegendStop {
  /** Valor inferior del tramo, expresado en la unidad de la capa. */
  readonly min: number;
  /** Valor superior del tramo, expresado en la unidad de la capa. */
  readonly max: number;
  /** Color HEX asociado al tramo. */
  readonly color: string;
}

export interface MapLegendDomain {
  readonly min: number;
  readonly max: number;
}

export interface MapLegendProps {
  /** Etiqueta de la capa visualizada, por ejemplo "Score territorial". */
  readonly label: string;
  /** Tramos de color ordenados de menor a mayor. */
  readonly stops: readonly MapLegendStop[];
  /** Sufijo mostrado junto a los valores (p. ej. " %", " €/m²"). */
  readonly unit?: string;
  /** Descripción corta que aparece bajo la etiqueta. */
  readonly description?: string;
  /** Dominio observado de la capa, mostrado como mínimos/máximos legibles. */
  readonly domain?: MapLegendDomain;
  readonly className?: string;
}

function formatBoundary(value: number, unit: string): string {
  // Para AQI/score (ints), usamos el formato local sin decimales. Para
  // valores no enteros (clima 14.7°C, services 3.0 ratio) permitimos uno o
  // dos decimales.
  const formatted = Number.isInteger(value)
    ? value.toLocaleString('es-ES')
    : value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  const trimmed = unit.trim();
  if (!trimmed) return formatted;
  if (/^[€%°]/.test(trimmed)) return `${formatted}${trimmed}`;
  return `${formatted}${unit}`;
}

export function MapLegend({
  label,
  stops,
  unit = '',
  description,
  domain,
  className,
}: MapLegendProps) {
  const cleanStops = stops ?? [];
  const lastStop = cleanStops[cleanStops.length - 1];
  const minValue = domain?.min ?? cleanStops[0]?.min ?? 0;
  const maxValue = domain?.max ?? lastStop?.max ?? 0;

  return (
    <figure
      className={[
        'pointer-events-auto rounded-xl bg-white/95 px-3 py-2 shadow-[var(--shadow-card)] backdrop-blur',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`Leyenda: ${label}`}
      data-testid="map-legend"
    >
      <figcaption className="flex flex-col gap-0.5">
        <span
          className="text-ink-700 text-[11px] font-semibold tracking-wide uppercase"
          data-testid="map-legend-label"
        >
          {label}
        </span>
        {description ? (
          <span className="text-ink-500 text-[10px] leading-tight" data-testid="map-legend-desc">
            {description}
          </span>
        ) : null}
      </figcaption>
      <ul className="mt-2 flex items-stretch gap-1" data-testid="map-legend-stops">
        {cleanStops.map((stop, idx) => (
          <li key={`${stop.min}-${stop.max}-${idx}`} className="flex flex-1 flex-col items-stretch">
            <span
              aria-hidden="true"
              className="block h-3 w-full rounded-sm"
              style={{ backgroundColor: stop.color }}
            />
          </li>
        ))}
      </ul>
      <div className="text-ink-500 mt-1 flex items-center justify-between text-[10px] tabular-nums">
        <span>{formatBoundary(minValue, unit)}</span>
        <span className="text-ink-400" data-testid="map-legend-unit">
          {unit.trim() === '' ? 'puntos' : unit.trim()}
        </span>
        <span>{formatBoundary(maxValue, unit)}</span>
      </div>
    </figure>
  );
}
