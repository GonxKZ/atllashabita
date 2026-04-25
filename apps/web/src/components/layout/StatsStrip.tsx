/* eslint-disable no-undef -- performance es global del navegador (DOM HighResolutionTime). */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '../ui/cn';

/**
 * AtlasHabita · StatsStrip (M12, issues #116, #122)
 *
 * Tira de cuatro KPIs sobre fondo glass que se sitúa entre el Topbar y el
 * contenido principal. La animación de cuenta atrás se mantiene en este
 * placeholder con `requestAnimationFrame`; el `NumberCountup` real
 * (Teammate B) lo sustituirá vía prop `renderValue`.
 *
 * Diseño:
 *  - Eyebrow uppercase + label en Geist semibold + valor en Fraunces
 *    display 32-40px tabular-nums + delta en chip moss / copper.
 *  - Cuatro columnas en >=lg, dos en md, una en sm. Soporta 2-6 KPIs sin
 *    cambios estructurales.
 *  - Respeta `prefers-reduced-motion` desactivando el countup y mostrando
 *    el valor final estático.
 */

export interface StatsStripItem {
  /** Identificador estable para keys de React. */
  id: string;
  /** Etiqueta corta tipo eyebrow. */
  eyebrow: string;
  /** Encabezado humano del KPI. */
  label: string;
  /** Valor numérico final (o el target del countup). */
  value: number;
  /** Sufijo opcional ("%", "/100", "M"). */
  suffix?: string;
  /** Prefijo opcional ("€", "+"). */
  prefix?: string;
  /** Cambio relativo en porcentaje (positivo o negativo). */
  delta?: number;
  /** Etiqueta del delta ("vs. mes pasado"). */
  deltaLabel?: string;
  /** Render personalizado del valor (NumberCountup real, sparkline, …). */
  renderValue?: (value: number) => ReactNode;
}

export interface StatsStripProps {
  items: StatsStripItem[];
  className?: string;
  /** Etiqueta accesible del grupo. Por defecto "Indicadores destacados". */
  ariaLabel?: string;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Hook ligero de countup numérico. No depende de GSAP para mantener este
 * fichero auto-contenido y compatible con SSR / tests sin RAF mockeado.
 */
function useCountup(target: number, durationMs = 900): number {
  const [value, setValue] = useState(target);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      setValue(target);
      return;
    }

    const reduce = window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
    if (reduce) {
      setValue(target);
      return;
    }

    const start = performance.now();
    const ease = (t: number): number => 1 - Math.pow(1 - t, 3);

    const step = (now: number): void => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      // Forma funcional: el cálculo no depende del valor previo, pero usar
      // la callback evita stale closures si en el futuro encadenamos
      // animaciones (`react-doctor/rerender-functional-setstate`).
      setValue(() => target * ease(t));
      if (t < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      }
    };

    rafRef.current = window.requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, [target, durationMs]);

  return value;
}

function formatNumber(value: number): string {
  // Si el valor original es entero, mostramos sin decimales; en otro caso,
  // limitamos a 1 decimal para no romper el grid en valores grandes.
  if (Number.isInteger(value)) {
    return new Intl.NumberFormat('es-ES').format(Math.round(value));
  }
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

function StatItem({ item }: { item: StatsStripItem }) {
  const animated = useCountup(item.value);
  const display = item.renderValue?.(animated) ?? (
    <span className="font-mono-num tabular-nums">{formatNumber(animated)}</span>
  );

  const tone = item.delta !== undefined ? (item.delta >= 0 ? 'positive' : 'negative') : 'neutral';

  return (
    <article
      aria-label={`${item.label}: ${item.prefix ?? ''}${formatNumber(item.value)}${item.suffix ?? ''}`}
      className="flex min-w-0 flex-col gap-1.5"
    >
      <span className="text-eyebrow text-[color:var(--color-linen-600)]">{item.eyebrow}</span>
      <h3 className="font-sans text-[13px] leading-snug font-medium text-[color:var(--color-linen-700)]">
        {item.label}
      </h3>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-display leading-none text-[color:var(--color-linen-900)]',
            'text-[clamp(28px,2.4rem,40px)] font-semibold tracking-[-0.02em]'
          )}
        >
          {item.prefix}
          {display}
          {item.suffix ? (
            <span className="text-[0.7em] font-medium text-[color:var(--color-linen-600)]">
              {item.suffix}
            </span>
          ) : null}
        </span>
        {item.delta !== undefined ? (
          <span
            data-tone={tone}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums',
              tone === 'positive' &&
                'bg-[color:color-mix(in_srgb,var(--color-moss-100)_75%,transparent)] text-[color:var(--color-moss-700)]',
              tone === 'negative' &&
                'bg-[color:color-mix(in_srgb,var(--color-copper-200)_70%,transparent)] text-[color:var(--color-copper-700)]',
              tone === 'neutral' &&
                'bg-[color:var(--color-linen-100)] text-[color:var(--color-linen-700)]'
            )}
          >
            <span aria-hidden="true">{item.delta >= 0 ? '↑' : '↓'}</span>
            {Math.abs(item.delta).toFixed(1)}%
            {item.deltaLabel ? (
              <span className="text-[10px] font-normal opacity-80">{item.deltaLabel}</span>
            ) : null}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export const DEFAULT_STATS_STRIP_ITEMS: StatsStripItem[] = [
  {
    id: 'municipios',
    eyebrow: 'Cobertura',
    label: 'Municipios analizados',
    value: 8131,
    delta: 1.4,
    deltaLabel: 'vs. trimestre',
  },
  {
    id: 'oportunidad',
    eyebrow: 'Índice global',
    label: 'Oportunidad agregada',
    value: 74,
    suffix: '/100',
    delta: 2.6,
    deltaLabel: 'vs. mes pasado',
  },
  {
    id: 'vivienda',
    eyebrow: 'Vivienda',
    label: 'Asequibilidad media',
    value: 62,
    suffix: '/100',
    delta: -0.8,
    deltaLabel: 'vs. mes pasado',
  },
  {
    id: 'fuentes',
    eyebrow: 'Datos abiertos',
    label: 'Fuentes federadas',
    value: 23,
    delta: 9.5,
    deltaLabel: 'nuevas este mes',
  },
];

export function StatsStrip({
  items,
  className,
  ariaLabel = 'Indicadores destacados',
}: StatsStripProps) {
  return (
    <section
      aria-label={ariaLabel}
      data-testid="stats-strip"
      className={cn(
        'surface-glass grain-overlay rounded-[20px]',
        'grid gap-6 px-6 py-5 md:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {items.map((item) => (
        <StatItem key={item.id} item={item} />
      ))}
    </section>
  );
}
