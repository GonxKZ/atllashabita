/**
 * Tooltip del mapa multi-métrica.
 *
 * Muestra el municipio destacado y, cuando se proveen, el listado completo
 * de indicadores con resaltado de la métrica activa (la que está coloreando
 * actualmente las burbujas). Esto permite al usuario interpretar la capa
 * elegida en el contexto del resto de dimensiones disponibles, alineado con
 * el principio de "no depender únicamente del color" descrito en
 * docs/16_FRONTEND_UX_UI_Y_FLUJOS.md §8.
 *
 * Cuando no se aportan indicadores adicionales (por ejemplo en mocks
 * mínimos), se cae a la versión clásica con score + valor de la capa
 * activa, conservando la API anterior.
 */

import { Fragment } from 'react';

export interface MapTooltipIndicator {
  /** Identificador estable del indicador (alineado con `national_mock`). */
  readonly id: string;
  /** Etiqueta legible para el usuario. */
  readonly label: string;
  /** Valor bruto. Se formatea con `toLocaleString` en español. */
  readonly value: number;
  /** Sufijo de unidad (`%`, ` €`, `°C`, ...). */
  readonly unit: string;
}

export interface MapTooltipProps {
  /** Nombre del municipio destacado. */
  readonly name: string;
  /** Valor del indicador asociado a la capa activa. */
  readonly value: number;
  /** Score agregado [0, 100] del territorio. */
  readonly score: number;
  /** Coordenada X (en píxeles) relativa al contenedor del mapa. */
  readonly x: number;
  /** Coordenada Y (en píxeles) relativa al contenedor del mapa. */
  readonly y: number;
  /** Sufijo mostrado junto al valor de la capa activa. */
  readonly unit?: string;
  /** Etiqueta humanizada de la capa activa (p. ej. "Banda ancha"). */
  readonly layerLabel?: string;
  /** ID de la capa activa, para resaltar el indicador correspondiente. */
  readonly activeIndicatorId?: string;
  /** Lista completa de indicadores del municipio. */
  readonly indicators?: readonly MapTooltipIndicator[];
  /** Provincia del municipio (mostrada como contexto). */
  readonly province?: string;
}

function formatValue(value: number, unit: string): string {
  const trimmedUnit = unit.trim();
  const formatted = Number.isInteger(value)
    ? value.toLocaleString('es-ES')
    : value.toLocaleString('es-ES', { maximumFractionDigits: 2 });
  if (!trimmedUnit) return formatted;
  // Las unidades que ya empiezan por símbolo (€, %, °) no necesitan espacio.
  if (/^[€%°]/.test(trimmedUnit)) return `${formatted}${trimmedUnit}`;
  return `${formatted} ${trimmedUnit}`;
}

export function MapTooltip({
  name,
  value,
  score,
  x,
  y,
  unit = '€',
  layerLabel,
  activeIndicatorId,
  indicators,
  province,
}: MapTooltipProps) {
  const showIndicatorList = Array.isArray(indicators) && indicators.length > 0;

  return (
    <div
      role="tooltip"
      data-testid="map-tooltip"
      className="pointer-events-none absolute z-10 min-w-[220px] -translate-x-1/2 -translate-y-full rounded-xl bg-[var(--color-ink-900)]/95 px-3 py-2.5 text-white shadow-[var(--shadow-elevated)]"
      style={{ left: x, top: y - 12 }}
    >
      <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--color-brand-200)] uppercase">
        Territorio
      </p>
      <p className="mt-0.5 text-sm leading-tight font-semibold">{name}</p>
      {province ? <p className="text-[11px] leading-tight text-white/60">{province}</p> : null}

      {/*
        Bloque "capa activa" + score: siempre visible para garantizar que la
        información esencial sigue presente aun cuando no se provean indicadores.
      */}
      <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-white/60">Score</dt>
          <dd className="text-base font-semibold text-white tabular-nums">{score}</dd>
        </div>
        <div>
          <dt className="text-white/60" data-testid="tooltip-active-layer">
            {layerLabel ?? 'Indicador'}
          </dt>
          <dd className="text-base font-semibold text-white tabular-nums">
            {formatValue(value, unit)}
          </dd>
        </div>
      </dl>

      {showIndicatorList ? (
        <Fragment>
          <p className="mt-3 text-[10px] font-semibold tracking-[0.16em] text-white/40 uppercase">
            Indicadores
          </p>
          <ul
            className="mt-1.5 grid grid-cols-1 gap-1 text-[11px]"
            data-testid="tooltip-indicators"
          >
            {indicators.map((indicator) => {
              const isActive = indicator.id === activeIndicatorId;
              return (
                <li
                  key={indicator.id}
                  data-active={isActive ? 'true' : 'false'}
                  className={
                    isActive
                      ? 'flex items-baseline justify-between gap-3 rounded-md bg-white/10 px-2 py-1 font-medium text-white'
                      : 'flex items-baseline justify-between gap-3 px-2 py-0.5 text-white/75'
                  }
                >
                  <span className="truncate">{indicator.label}</span>
                  <span className="shrink-0 tabular-nums">
                    {formatValue(indicator.value, indicator.unit)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Fragment>
      ) : null}
    </div>
  );
}
