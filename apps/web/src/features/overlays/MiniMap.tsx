/**
 * MiniMap — vista miniatura de España con recuadro del viewport actual.
 *
 * Componente decorativo y de navegación contextual, situado en la esquina
 * inferior derecha del Atelier. Muestra las dimensiones de España y un
 * recuadro proporcional al `viewport` que el usuario está viendo en el
 * mapa principal. Cuando el viewport no se conoce (estado inicial o tests
 * con jsdom), el recuadro cubre el bounding-box completo, indicando "vista
 * país".
 *
 * Decisiones de diseño:
 *  - Implementado en SVG para evitar arrastrar otra instancia de MapLibre
 *    (con su contexto WebGL y `URL.createObjectURL`) cuya complejidad sería
 *    excesiva para este uso decorativo. SVG ofrece render predecible en
 *    jsdom y soporta WebKit/Firefox/Edge sin polyfills.
 *  - Sin controles de zoom/desplazamiento (regla del spec).
 *  - Acepta un viewport opcional para cuando se ajuste al estado real del
 *    mapa principal (issue futura). De momento se renderiza una vista
 *    nacional fija, suficiente para el flujo definido en M12.
 *
 * Accesibilidad:
 *  - `role="img"` y `aria-label` describen el propósito del minimap. El
 *    contenido SVG queda marcado con `aria-hidden` para que el lector de
 *    pantalla no anuncie path por path.
 */

import { useMemo } from 'react';
import { cn } from '@/components/ui/cn';
import { useUiStore } from '@/state/ui';

/** Bounds aproximados de España peninsular + Baleares + Canarias. */
const SPAIN_BOUNDS = {
  minLon: -10,
  maxLon: 4.5,
  minLat: 35.5,
  maxLat: 44,
} as const;

export interface MiniMapViewport {
  readonly minLon: number;
  readonly maxLon: number;
  readonly minLat: number;
  readonly maxLat: number;
}

export interface MiniMapProps {
  /** Viewport actual del mapa principal en coordenadas WGS84. */
  readonly viewport?: MiniMapViewport;
  /** Mostrar/ocultar minimap (los tests pueden forzar `true`). */
  readonly forcedVisible?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
}

interface ProjectedRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const MINI_MAP_WIDTH = 200;
const MINI_MAP_HEIGHT = 140;

/**
 * Proyecta un viewport (lon/lat) al rectángulo SVG del minimap. Es una
 * proyección equirectangular sencilla, suficiente para la vista de España
 * en formato 200×140 px sin distorsión perceptible.
 */
function projectViewport(viewport: MiniMapViewport): ProjectedRect {
  const lonSpan = SPAIN_BOUNDS.maxLon - SPAIN_BOUNDS.minLon;
  const latSpan = SPAIN_BOUNDS.maxLat - SPAIN_BOUNDS.minLat;

  const clampedMinLon = Math.max(SPAIN_BOUNDS.minLon, viewport.minLon);
  const clampedMaxLon = Math.min(SPAIN_BOUNDS.maxLon, viewport.maxLon);
  const clampedMinLat = Math.max(SPAIN_BOUNDS.minLat, viewport.minLat);
  const clampedMaxLat = Math.min(SPAIN_BOUNDS.maxLat, viewport.maxLat);

  const x = ((clampedMinLon - SPAIN_BOUNDS.minLon) / lonSpan) * MINI_MAP_WIDTH;
  const width = ((clampedMaxLon - clampedMinLon) / lonSpan) * MINI_MAP_WIDTH;
  // Lat es invertida en SVG (eje Y crece hacia abajo).
  const y = ((SPAIN_BOUNDS.maxLat - clampedMaxLat) / latSpan) * MINI_MAP_HEIGHT;
  const height = ((clampedMaxLat - clampedMinLat) / latSpan) * MINI_MAP_HEIGHT;

  return {
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
    width: Math.max(8, Number.isFinite(width) ? width : MINI_MAP_WIDTH),
    height: Math.max(8, Number.isFinite(height) ? height : MINI_MAP_HEIGHT),
  };
}

const DEFAULT_VIEWPORT: MiniMapViewport = {
  minLon: SPAIN_BOUNDS.minLon,
  maxLon: SPAIN_BOUNDS.maxLon,
  minLat: SPAIN_BOUNDS.minLat,
  maxLat: SPAIN_BOUNDS.maxLat,
};

export function MiniMap({
  viewport = DEFAULT_VIEWPORT,
  forcedVisible,
  className,
  ariaLabel = 'Mini-mapa de España con recuadro del viewport actual',
}: MiniMapProps) {
  const isVisible = useUiStore((state) => state.miniMapOpen);
  const toggleMiniMap = useUiStore((state) => state.toggleMiniMap);
  const visible = forcedVisible ?? isVisible;

  const rect = useMemo(() => projectViewport(viewport), [viewport]);

  if (!visible) {
    return (
      <button
        type="button"
        onClick={toggleMiniMap}
        data-feature="mini-map"
        data-state="collapsed"
        aria-label="Mostrar mini-mapa"
        style={{ zIndex: 'var(--z-overlay-quiet)' as unknown as number }}
        className={cn(
          'pointer-events-auto absolute right-4 bottom-4 inline-flex h-8 items-center gap-2 rounded-full',
          'border border-white/40 bg-white/85 px-3 text-[11px] font-semibold text-[var(--color-ink-700)] shadow-[var(--shadow-card)] backdrop-blur',
          'focus-visible:ring-brand-300 hover:bg-white focus-visible:ring-2 focus-visible:outline-none',
          className
        )}
      >
        Mostrar mini-mapa
      </button>
    );
  }

  return (
    <figure
      data-feature="mini-map"
      data-state="expanded"
      data-testid="mini-map"
      role="img"
      aria-label={ariaLabel}
      style={{ zIndex: 'var(--z-overlay-quiet)' as unknown as number }}
      className={cn(
        'pointer-events-auto absolute right-4 bottom-4 overflow-hidden rounded-2xl',
        'border border-white/40 bg-white/85 p-2 shadow-[var(--shadow-card)] backdrop-blur',
        className
      )}
    >
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${MINI_MAP_WIDTH} ${MINI_MAP_HEIGHT}`}
        width={MINI_MAP_WIDTH}
        height={MINI_MAP_HEIGHT}
        className="block"
      >
        <defs>
          <linearGradient id="mini-map-bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-50)" />
            <stop offset="100%" stopColor="var(--color-surface-muted)" />
          </linearGradient>
        </defs>
        <rect
          x={0}
          y={0}
          width={MINI_MAP_WIDTH}
          height={MINI_MAP_HEIGHT}
          fill="url(#mini-map-bg)"
          rx={12}
        />
        {/*
         * Silueta esquemática de España: péninsula + Baleares + Canarias.
         * Coordenadas relativas al viewBox; pensadas para una representación
         * reconocible sin necesidad de TopoJSON.
         */}
        <g
          aria-hidden="true"
          fill="var(--color-brand-200)"
          stroke="var(--color-brand-600)"
          strokeWidth={0.6}
        >
          <path d="M28 36 C 36 22, 60 18, 80 22 L 110 24 C 140 22, 160 30, 168 50 L 174 80 C 168 100, 140 112, 100 110 L 60 108 C 40 102, 24 84, 28 64 Z" />
          <circle cx={172} cy={64} r={4} />
          <circle cx={166} cy={70} r={3} />
          <circle cx={26} cy={120} r={6} />
          <circle cx={36} cy={124} r={3} />
        </g>
        {/* Recuadro del viewport actual. */}
        <rect
          data-testid="mini-map-viewport"
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          fill="var(--color-brand-500)"
          fillOpacity={0.18}
          stroke="var(--color-brand-700)"
          strokeWidth={1.4}
          rx={4}
        />
      </svg>
      <figcaption className="text-ink-500 mt-1 flex items-center justify-between text-[10px] tracking-wide uppercase">
        <span className="font-semibold">Vista España</span>
        <button
          type="button"
          onClick={toggleMiniMap}
          aria-label="Ocultar mini-mapa"
          className="text-ink-500 hover:text-ink-900"
          data-testid="mini-map-toggle"
        >
          Ocultar
        </button>
      </figcaption>
    </figure>
  );
}
