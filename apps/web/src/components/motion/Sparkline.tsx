import { useId, useMemo } from 'react';

export interface SparklineProps {
  /**
   * Serie temporal a representar. Debe tener al menos un punto. Acepta
   * únicamente números finitos (los `NaN`/`Infinity` se sanean a 0).
   */
  values: readonly number[];
  /** Ancho intrínseco del SVG. Por defecto 96. */
  width?: number;
  /** Alto intrínseco del SVG. Por defecto 28. */
  height?: number;
  /** Stroke width en píxeles. Por defecto 1.5. */
  strokeWidth?: number;
  /** Color del trazo. Por defecto `currentColor` (hereda del padre). */
  stroke?: string;
  /** Color de relleno (área). Por defecto `transparent`. */
  fill?: string;
  /** Etiqueta accesible. Si se omite usamos un fallback descriptivo. */
  ariaLabel?: string;
  /** Opacidad del relleno. Por defecto 0.16 cuando hay fill explícito. */
  fillOpacity?: number;
  /** Padding interno (px) para que el trazo no toque los bordes. */
  padding?: number;
  className?: string;
}

interface NormalizedSerie {
  readonly path: string;
  readonly area: string;
  readonly minIndex: number;
  readonly maxIndex: number;
}

/**
 * Saneamos la serie para tolerar valores no numéricos sin romper el
 * cálculo del rango. Devolvemos un array de la misma longitud porque
 * preferimos preservar la cadencia temporal a "saltarnos" puntos.
 */
function sanitize(values: readonly number[]): number[] {
  return values.map((value) => (Number.isFinite(value) ? value : 0));
}

/**
 * Construye los `path` del trazo y del área usando coordenadas
 * normalizadas al recuadro del SVG. El cálculo es memoizable porque
 * depende exclusivamente de los inputs declarados.
 */
function buildSerie(
  values: readonly number[],
  width: number,
  height: number,
  padding: number
): NormalizedSerie {
  const sanitized = sanitize(values);
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);

  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  let minIndex = 0;
  let maxIndex = 0;
  sanitized.forEach((value, index) => {
    if (value < min) {
      min = value;
      minIndex = index;
    }
    if (value > max) {
      max = value;
      maxIndex = index;
    }
  });

  // Para series planas usamos el centro vertical, evitando una
  // división por cero cuando max === min.
  const range = max - min;
  const safeRange = range === 0 ? 1 : range;
  const stepX = sanitized.length > 1 ? innerW / (sanitized.length - 1) : 0;

  const points = sanitized.map((value, index) => {
    const x = padding + stepX * index;
    const ratio = range === 0 ? 0.5 : (value - min) / safeRange;
    // Invertimos Y porque en SVG el origen está en la esquina superior.
    const y = padding + innerH - ratio * innerH;
    return [x, y] as const;
  });

  if (points.length === 0) {
    return { path: '', area: '', minIndex, maxIndex };
  }

  const path = points
    .map(([x, y], index) =>
      index === 0 ? `M${x.toFixed(2)} ${y.toFixed(2)}` : `L${x.toFixed(2)} ${y.toFixed(2)}`
    )
    .join(' ');

  const lastX = points[points.length - 1][0];
  const firstX = points[0][0];
  const baseY = padding + innerH;
  const area = `${path} L${lastX.toFixed(2)} ${baseY.toFixed(2)} L${firstX.toFixed(2)} ${baseY.toFixed(2)} Z`;

  return { path, area, minIndex, maxIndex };
}

/**
 * Sparkline SVG ligero, sin dependencias de Recharts ni D3, pensado
 * para tooltips y resúmenes de tendencias en el mapa AtlasHabita.
 *
 * Características:
 *   - Trabaja con `viewBox` para escalar limpio a cualquier tamaño CSS.
 *   - Genera un `path` compuesto (línea + área opcional) en una sola
 *     pasada, cubriendo el caso degenerado de series planas.
 *   - Marca con `<title>` para accesibilidad básica (lectores de
 *     pantalla anunciarán la etiqueta del gráfico).
 */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  strokeWidth = 1.5,
  stroke = 'currentColor',
  fill = 'transparent',
  fillOpacity,
  padding = 2,
  ariaLabel,
  className,
}: SparklineProps) {
  const titleId = useId();
  const serie = useMemo(
    () => buildSerie(values, width, height, padding),
    [values, width, height, padding]
  );

  const safeLabel = ariaLabel ?? `Tendencia (${values.length} valores)`;
  const showFill = fill !== 'transparent';
  const resolvedFillOpacity = fillOpacity ?? (showFill ? 0.16 : 0);

  return (
    <svg
      role="img"
      aria-labelledby={titleId}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      data-motion="sparkline"
    >
      <title id={titleId}>{safeLabel}</title>
      {showFill && serie.area ? (
        <path d={serie.area} fill={fill} fillOpacity={resolvedFillOpacity} stroke="none" />
      ) : null}
      {serie.path ? (
        <path
          d={serie.path}
          stroke={stroke}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      ) : null}
    </svg>
  );
}
