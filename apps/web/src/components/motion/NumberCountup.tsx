import { useMemo, useRef, useState, type ElementType } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { DURATIONS, EASINGS, prefersReducedMotion } from '@/animations';

export interface NumberCountupProps {
  /** Valor objetivo. Acepta enteros y decimales. */
  value: number;
  /**
   * Valor inicial al montar. Por defecto 0; se puede usar el valor
   * previo cuando se renderiza una secuencia de actualizaciones para
   * evitar el "tic" de retroceso.
   */
  from?: number;
  /** Duración del tweening. Por defecto `lush` (0.55 s). */
  duration?: number;
  /** Locale del formateador. Por defecto `'es-ES'`. */
  locale?: string;
  /** Opciones forwardeadas a `Intl.NumberFormat`. */
  formatOptions?: Intl.NumberFormatOptions;
  /** Sufijo opcional (`'%'`, `'€'`, `' km'`…). */
  suffix?: string;
  /** Prefijo opcional (`'+'`, `'€'`, …). */
  prefix?: string;
  /** Tag HTML del wrapper. Por defecto `<span>`. */
  as?: ElementType;
  className?: string;
  /** Etiqueta accesible: si se omite usamos el valor formateado final. */
  'aria-label'?: string;
}

/**
 * Construye el formateador `Intl.NumberFormat` memoizado por locale y
 * opciones para evitar instanciaciones innecesarias en cada render.
 */
function useNumberFormatter(
  locale: string,
  options: Intl.NumberFormatOptions | undefined
): Intl.NumberFormat {
  return useMemo(() => new Intl.NumberFormat(locale, options), [locale, options]);
}

/**
 * Componente que anima la transición numérica entre dos valores con
 * `gsap.to`, formateando el resultado con `Intl.NumberFormat('es-ES')`
 * por defecto. Es ideal para los KPIs del Atelier (StatsStrip, hero
 * counters, recomendaciones), donde la cifra final tiene tanta carga
 * informativa como su variación.
 *
 * Detalles de accesibilidad:
 *   - El wrapper expone `role="text"` para garantizar que screen readers
 *     compatibles lo anuncien como una unidad.
 *   - Cuando el usuario solicita movimiento reducido, saltamos
 *     directamente al valor final y el `aria-label` refleja el estado
 *     final desde el primer pintado.
 */
export function NumberCountup({
  value,
  from = 0,
  duration = DURATIONS.lush,
  locale = 'es-ES',
  formatOptions,
  suffix,
  prefix,
  as,
  className,
  'aria-label': ariaLabelOverride,
}: NumberCountupProps) {
  const formatter = useNumberFormatter(locale, formatOptions);
  const [display, setDisplay] = useState<string>(() => formatter.format(from));
  const targetRef = useRef<{ current: number }>({ current: from });

  useGSAP(() => {
    const proxy = targetRef.current;

    if (prefersReducedMotion()) {
      // Saltamos directamente al valor final. Mantener el estado en
      // `proxy.current` permite que tweens posteriores arranquen desde
      // ese valor sin "rebote" hacia 0.
      proxy.current = value;
      setDisplay(formatter.format(value));
      return;
    }

    const tween = gsap.to(proxy, {
      current: value,
      duration,
      ease: EASINGS.enter,
      overwrite: 'auto',
      onUpdate: () => {
        setDisplay(formatter.format(proxy.current));
      },
      onComplete: () => {
        // Forzar el formato exacto al final para que cifras decimales
        // no se queden en valores como `12.999998…`.
        setDisplay(formatter.format(value));
      },
    });

    return () => {
      tween.kill();
    };
  }, [value, duration, formatter]);

  const ariaLabel = ariaLabelOverride ?? `${prefix ?? ''}${formatter.format(value)}${suffix ?? ''}`;

  const Component = (as ?? 'span') as ElementType;
  return (
    <Component
      className={className}
      data-motion="number-countup"
      data-target-value={value}
      aria-label={ariaLabel}
    >
      {prefix}
      <span aria-hidden="true" className="tabular-nums">
        {display}
      </span>
      {suffix}
    </Component>
  );
}

// Nota tipográfica: la animación es puramente visual; el `aria-label`
// transmite el dato definitivo a las tecnologías asistivas y el
// wrapper interno se marca `aria-hidden` para no leer cada tick.
