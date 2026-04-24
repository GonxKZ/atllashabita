import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { resolveDuration } from '@/animations';
import { MapLegend, type MapLegendStop } from './MapLegend';
import { MapTooltip } from './MapTooltip';
import type { MapPoint } from '@/data/mock';

/**
 * Escala verde oscuro → verde claro utilizada en el mapa. Coincide con la
 * rampa del sistema de diseño (`brand-800` → `brand-200`). Al ordenarse de
 * mayor a menor score, valores altos reciben el verde más intenso, coherente
 * con la semántica "encaja mejor" descrita en `16_FRONTEND_UX_UI_Y_FLUJOS.md`.
 */
const GREEN_RAMP = ['#065f46', '#047857', '#059669', '#10b981', '#34d399'] as const;

/**
 * Umbrales de score que particionan el rango [0, 100] en 5 tramos.
 * Se exponen como constantes para que los tests y la leyenda puedan
 * referenciarlos sin duplicación.
 */
const SCORE_BREAKS = [80, 65, 50, 35, 0] as const;

/** URL pública del estilo vectorial OpenFreeMap (Liberty). No requiere API key. */
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * Estilo de fallback cuando no se puede cargar OpenFreeMap (entorno offline,
 * tests, o error de red). Mantiene el color de marca para que la pantalla
 * no se degrade a un lienzo negro.
 */
const FALLBACK_STYLE = {
  version: 8 as const,
  name: 'atlashabita-fallback',
  sources: {},
  layers: [
    {
      id: 'atlashabita-background',
      type: 'background' as const,
      paint: {
        'background-color': '#eef2f1',
      },
    },
  ],
};

export type SpainMapProps = {
  /** Puntos coroplético-equivalentes a renderizar como círculos. */
  points: MapPoint[];
  /** Etiqueta accesible del mapa para lectores de pantalla. */
  ariaLabel?: string;
  className?: string;
  /** Etiqueta de la capa activa mostrada en la leyenda. */
  layerLabel?: string;
  /** Sufijo de unidad del indicador activo (se propaga al tooltip). */
  unit?: string;
  /**
   * Fuerza el estilo de fallback. Útil en tests para evitar peticiones de red
   * y en entornos sin acceso a OpenFreeMap.
   */
  offline?: boolean;
};

type HoveredState = {
  point: MapPoint;
  x: number;
  y: number;
};

/**
 * Devuelve el color del score respetando los tramos declarados en
 * `SCORE_BREAKS` y `GREEN_RAMP`.
 */
export function scoreToColor(score: number): string {
  for (let index = 0; index < SCORE_BREAKS.length; index += 1) {
    if (score >= SCORE_BREAKS[index]) {
      return GREEN_RAMP[index];
    }
  }
  return GREEN_RAMP[GREEN_RAMP.length - 1];
}

function buildLegendStops(): MapLegendStop[] {
  // Presentamos los tramos de menor a mayor para leerse de izquierda a derecha.
  const stops: MapLegendStop[] = [];
  for (let index = SCORE_BREAKS.length - 1; index >= 0; index -= 1) {
    const min = SCORE_BREAKS[index];
    const max = index === 0 ? 100 : SCORE_BREAKS[index - 1];
    stops.push({ min, max, color: GREEN_RAMP[index] });
  }
  return stops;
}

export function SpainMap({
  points,
  ariaLabel = 'Mapa territorial de España',
  className,
  layerLabel = 'Score territorial',
  unit = '',
  offline = false,
}: SpainMapProps) {
  const [hovered, setHovered] = useState<HoveredState | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);

  const legendStops = useMemo(() => buildLegendStops(), []);

  const markers = useMemo(
    () =>
      points.map((point) => ({
        ...point,
        color: scoreToColor(point.score),
        radius: 10 + Math.round((point.score / 100) * 14),
      })),
    [points]
  );

  /*
   * Animación de entrada de los marcadores al montar (o cuando cambian los
   * puntos). Usamos `gsap.from` sobre `.maplibregl-marker` para que cada pin
   * aparezca con un leve "pop" escalonado. Respeta `prefers-reduced-motion`.
   */
  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;
      const targets = container.querySelectorAll('.maplibregl-marker');
      if (targets.length === 0) return;
      gsap.from(targets, {
        scale: 0,
        opacity: 0,
        duration: resolveDuration(0.45),
        stagger: 0.04,
        ease: 'back.out(1.5)',
        transformOrigin: '50% 50%',
        clearProps: 'transform,opacity',
      });
    },
    {
      scope: containerRef,
      dependencies: [markers.length],
    }
  );

  const handleEnter = useCallback(
    (point: MapPoint) => (event: ReactPointerEvent<Element>) => {
      const container = event.currentTarget.closest('[data-spain-map]') as HTMLElement | null;
      const rect = container?.getBoundingClientRect();
      const x = rect ? event.clientX - rect.left : event.clientX;
      const y = rect ? event.clientY - rect.top : event.clientY;
      setHovered({ point, x, y });
    },
    []
  );

  const handleMove = useCallback(
    (event: ReactPointerEvent<Element>) => {
      if (!hovered) return;
      const container = event.currentTarget.closest('[data-spain-map]') as HTMLElement | null;
      const rect = container?.getBoundingClientRect();
      const x = rect ? event.clientX - rect.left : event.clientX;
      const y = rect ? event.clientY - rect.top : event.clientY;
      setHovered((prev) => (prev ? { ...prev, x, y } : prev));
    },
    [hovered]
  );

  const handleLeave = useCallback(() => setHovered(null), []);

  const mapStyle = offline ? FALLBACK_STYLE : OPENFREEMAP_STYLE;

  return (
    <section
      ref={(node) => {
        containerRef.current = node;
      }}
      data-spain-map
      aria-label={ariaLabel}
      className={[
        'relative h-full min-h-[360px] w-full overflow-hidden rounded-2xl bg-[var(--color-surface-muted)] shadow-[var(--shadow-card)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Map
        initialViewState={{ longitude: -3.7, latitude: 40.0, zoom: 5 }}
        mapStyle={mapStyle as unknown as string}
        attributionControl={false}
        style={{ width: '100%', height: '100%' }}
        dragRotate={false}
        pitchWithRotate={false}
        reuseMaps
      >
        <NavigationControl position="top-right" showCompass={false} />
        {markers.map((marker) => (
          <Marker key={marker.id} longitude={marker.lon} latitude={marker.lat} anchor="center">
            <button
              type="button"
              aria-label={`${marker.name}: score ${marker.score}`}
              className="relative flex items-center justify-center rounded-full border-2 border-white/90 transition-transform hover:scale-110 focus-visible:scale-110"
              style={{
                width: marker.radius,
                height: marker.radius,
                backgroundColor: marker.color,
                boxShadow: '0 6px 18px -8px rgba(6, 95, 70, 0.55)',
              }}
              onPointerEnter={handleEnter(marker)}
              onPointerMove={handleMove}
              onPointerLeave={handleLeave}
              onFocus={(event) => {
                const container = event.currentTarget.closest(
                  '[data-spain-map]'
                ) as HTMLElement | null;
                const rect = container?.getBoundingClientRect();
                const btn = event.currentTarget.getBoundingClientRect();
                const x = rect ? btn.left + btn.width / 2 - rect.left : btn.left;
                const y = rect ? btn.top - rect.top : btn.top;
                setHovered({ point: marker, x, y });
              }}
              onBlur={handleLeave}
            >
              <span
                aria-hidden="true"
                className="absolute inset-1 rounded-full opacity-80"
                style={{
                  background:
                    'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), transparent 60%)',
                }}
              />
            </button>
          </Marker>
        ))}
      </Map>

      {hovered ? (
        <MapTooltip
          name={hovered.point.name}
          value={hovered.point.value}
          score={hovered.point.score}
          x={hovered.x}
          y={hovered.y}
          unit={unit}
        />
      ) : null}

      <MapLegend label={layerLabel} stops={legendStops} className="absolute bottom-4 left-4" />
    </section>
  );
}
