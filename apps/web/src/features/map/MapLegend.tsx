/**
 * Leyenda cromática del mapa. Representa los 5 tramos de la escala verde
 * empleada por `SpainMap` y expone la etiqueta semántica de la capa activa
 * para que la interpretación del color sea accesible (principio de no
 * depender únicamente del color, ver docs/16_FRONTEND_UX_UI_Y_FLUJOS.md §8).
 */

export type MapLegendStop = {
  /** Valor inferior del tramo, expresado en la unidad de la capa. */
  min: number;
  /** Valor superior del tramo, expresado en la unidad de la capa. */
  max: number;
  /** Color HEX asociado al tramo. */
  color: string;
};

export type MapLegendProps = {
  /** Etiqueta de la capa visualizada, por ejemplo "Score territorial". */
  label: string;
  /** Tramos de color ordenados de menor a mayor. */
  stops: MapLegendStop[];
  /** Sufijo mostrado junto a los valores (p.ej. "€", "%"). */
  unit?: string;
  className?: string;
};

export function MapLegend({ label, stops, unit = '', className }: MapLegendProps) {
  return (
    <figure
      className={[
        'pointer-events-auto rounded-xl bg-white/95 px-3 py-2 shadow-[var(--shadow-card)] backdrop-blur',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`Leyenda: ${label}`}
    >
      <figcaption className="text-ink-700 text-[11px] font-semibold tracking-wide uppercase">
        {label}
      </figcaption>
      <ul className="mt-2 flex items-center gap-1">
        {stops.map((stop) => (
          <li key={`${stop.min}-${stop.max}`} className="flex flex-col items-center gap-1">
            <span
              aria-hidden="true"
              className="block h-3 w-8 rounded-sm"
              style={{ backgroundColor: stop.color }}
            />
            <span className="text-ink-500 text-[10px] tabular-nums">
              {stop.min}
              {unit}
            </span>
          </li>
        ))}
        <li className="flex flex-col items-center gap-1" aria-hidden="true">
          <span className="block h-3 w-0" />
          <span className="text-ink-500 text-[10px] tabular-nums">
            {stops[stops.length - 1]?.max ?? 0}
            {unit}
          </span>
        </li>
      </ul>
    </figure>
  );
}
