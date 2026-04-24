/**
 * Tooltip ligero que flota sobre el canvas del mapa mostrando el nombre del
 * municipio, el score y el valor bruto del indicador. El componente es puro
 * (sólo depende de las props) para poder memoizar su render desde `SpainMap`.
 */

export type MapTooltipProps = {
  /** Nombre del municipio destacado. */
  name: string;
  /** Valor bruto del indicador (se muestra con separadores locales). */
  value: number;
  /** Score agregado [0, 100] asociado al territorio. */
  score: number;
  /** Coordenada X (en píxeles) relativa al contenedor del mapa. */
  x: number;
  /** Coordenada Y (en píxeles) relativa al contenedor del mapa. */
  y: number;
  /** Sufijo mostrado junto al valor bruto. */
  unit?: string;
};

export function MapTooltip({ name, value, score, x, y, unit = '€' }: MapTooltipProps) {
  return (
    <div
      role="tooltip"
      className="pointer-events-none absolute z-10 min-w-[160px] -translate-x-1/2 -translate-y-full rounded-xl bg-[var(--color-ink-900)]/95 px-3 py-2 text-white shadow-[var(--shadow-elevated)]"
      style={{ left: x, top: y - 12 }}
    >
      <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--color-brand-200)] uppercase">
        Territorio
      </p>
      <p className="mt-0.5 text-sm font-semibold">{name}</p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-white/60">Score</dt>
          <dd className="text-base font-semibold text-white tabular-nums">{score}</dd>
        </div>
        <div>
          <dt className="text-white/60">Indicador</dt>
          <dd className="text-base font-semibold text-white tabular-nums">
            {value.toLocaleString('es-ES')}
            {unit}
          </dd>
        </div>
      </dl>
    </div>
  );
}
