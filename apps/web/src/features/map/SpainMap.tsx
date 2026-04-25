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

import { prefersReducedMotion, resolveDuration } from '@/animations';
import { MapLegend } from './MapLegend';
import { MapTooltip, type MapTooltipIndicator } from './MapTooltip';
import { MarkerRichTooltip } from '@/features/overlays/MarkerRichTooltip';
import {
  buildLegendStops,
  computeLayerDomain,
  resolveLayer,
  valueToColor,
  valueToRadius,
  type EnrichedMapPoint,
  type MapLayerDefinition,
  type MapLayerId,
} from './layers/catalog';
import type { MapPoint } from '@/data/mock';

/**
 * URL pública del estilo vectorial OpenFreeMap (Liberty). No requiere API key.
 */
const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * Estilo de fallback cuando no se puede cargar OpenFreeMap (entorno offline,
 * tests, o error de red).
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

/**
 * Paleta verde original heredada del primer iterador del mapa. Se mantiene
 * exportada para que los tests existentes y otros consumidores legacy puedan
 * seguir importando `scoreToColor`.
 */
const LEGACY_GREEN_RAMP = ['#065f46', '#047857', '#059669', '#10b981', '#34d399'] as const;
const LEGACY_SCORE_BREAKS = [80, 65, 50, 35, 0] as const;

/**
 * Devuelve el color del score respetando los tramos verdes legacy.
 * Conservada por compatibilidad con tests y código previo.
 */
export function scoreToColor(score: number): string {
  for (let index = 0; index < LEGACY_SCORE_BREAKS.length; index += 1) {
    if (score >= LEGACY_SCORE_BREAKS[index]) {
      return LEGACY_GREEN_RAMP[index];
    }
  }
  return LEGACY_GREEN_RAMP[LEGACY_GREEN_RAMP.length - 1];
}

export type SpainMapPoint = MapPoint | EnrichedMapPoint;

export interface SpainMapProps {
  /** Puntos a representar como burbujas. */
  readonly points: readonly SpainMapPoint[];
  /** Etiqueta accesible del mapa para lectores de pantalla. */
  readonly ariaLabel?: string;
  readonly className?: string;
  /** Identificador de capa activa (catálogo). */
  readonly layerId?: MapLayerId;
  /**
   * Etiqueta de la capa activa mostrada en la leyenda. Si se omite y se
   * dispone de `layerId`, se infiere desde el catálogo.
   */
  readonly layerLabel?: string;
  /**
   * Sufijo de unidad del indicador activo. Se infiere del catálogo cuando
   * está disponible. Mantenido por compatibilidad con la API previa.
   */
  readonly unit?: string;
  /**
   * Fuerza el estilo de fallback. Útil en tests para evitar peticiones de red
   * y en entornos sin acceso a OpenFreeMap.
   */
  readonly offline?: boolean;
  /**
   * Cuando `true`, el mapa usa el tooltip rico del Atelier
   * (`MarkerRichTooltip`) en lugar del clásico `MapTooltip`. El tooltip
   * rico incluye sparkline 12 meses, top-3 indicadores y CTA "Ver ficha".
   */
  readonly enrichedTooltip?: boolean;
  /**
   * Oculta la leyenda integrada (`MapLegend`). Útil cuando otra superficie
   * (p. ej. `RichLegend` del Atelier) ya dibuja una leyenda flotante.
   */
  readonly hideLegend?: boolean;
  /**
   * Callback emitido cuando el usuario activa un marcador (clic en el
   * marcador o en el CTA del tooltip rico). Habilita la apertura de la
   * ficha territorial en `TerritorySheet`.
   */
  readonly onMarkerSelect?: (id: string) => void;
}

interface MarkerPresentation {
  readonly id: string;
  readonly name: string;
  readonly lat: number;
  readonly lon: number;
  readonly score: number;
  readonly value: number;
  readonly color: string;
  readonly radius: number;
  readonly indicators?: readonly MapTooltipIndicator[];
  readonly province?: string;
}

interface HoveredState {
  readonly marker: MarkerPresentation;
  readonly x: number;
  readonly y: number;
}

function isEnriched(point: SpainMapPoint): point is EnrichedMapPoint {
  return 'indicators' in point && Array.isArray((point as EnrichedMapPoint).indicators);
}

/**
 * Convierte un punto (legacy o enriquecido) en el shape consumido por el
 * catálogo de capas. Para puntos legacy se simulan los indicadores mínimos
 * (`score`) que satisfacen los selectores del catálogo de capas.
 */
function ensureEnriched(point: SpainMapPoint): EnrichedMapPoint {
  if (isEnriched(point)) return point;
  return {
    ...point,
    indicators: [],
    population: 0,
    province: '',
    autonomousCommunity: '',
  };
}

export function SpainMap({
  points,
  ariaLabel = 'Mapa territorial de España',
  className,
  layerId,
  layerLabel,
  unit,
  offline = false,
  enrichedTooltip = false,
  hideLegend = false,
  onMarkerSelect,
}: SpainMapProps) {
  const [hovered, setHovered] = useState<HoveredState | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const hideTooltipTimerRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  /*
   * Resolver la capa activa: cuando viene un `layerId` consultamos el
   * catálogo. Si no se especifica, mantenemos compatibilidad con el
   * comportamiento previo construyendo una capa "virtual" de score con la
   * paleta verde original. Esto evita que clientes antiguos (los tests del
   * propio repo o snapshots ya tomados) sufran cambios visuales no deseados.
   */
  const activeLayer: MapLayerDefinition = useMemo(() => {
    if (layerId) return resolveLayer(layerId);
    return {
      id: 'score',
      label: layerLabel ?? 'Score territorial',
      description: 'Score agregado [0, 100] del municipio.',
      unit: unit ?? '',
      palette: [...LEGACY_GREEN_RAMP] as unknown as MapLayerDefinition['palette'],
      selector: (point) => point.score,
    };
  }, [layerId, layerLabel, unit]);

  const enrichedPoints = useMemo(() => points.map(ensureEnriched), [points]);

  const domain = useMemo(
    () => computeLayerDomain(enrichedPoints, activeLayer),
    [enrichedPoints, activeLayer]
  );

  const markers = useMemo<MarkerPresentation[]>(
    () =>
      enrichedPoints.map((point) => {
        const value = activeLayer.selector(point);
        return {
          id: point.id,
          name: point.name,
          lat: point.lat,
          lon: point.lon,
          score: point.score,
          value,
          color: valueToColor(value, activeLayer, domain),
          radius: valueToRadius(value, domain),
          indicators: point.indicators?.map((indicator) => ({
            id: indicator.id,
            label: indicator.label,
            value: indicator.value,
            unit: indicator.unit,
          })),
          province: point.province || undefined,
        };
      }),
    [enrichedPoints, activeLayer, domain]
  );

  const legendStops = useMemo(() => buildLegendStops(activeLayer, domain), [activeLayer, domain]);

  const resolvedUnit = unit ?? activeLayer.unit;
  const resolvedLabel = layerLabel ?? activeLayer.label;

  /*
   * Animación de entrada de los marcadores al montar (o cuando cambia la
   * cantidad de puntos). NO la disparamos cuando cambia la capa: en ese caso
   * solo actualizamos colores/tamaños y respetamos `prefers-reduced-motion`.
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

  /*
   * Transición de color al cambiar de capa. La duración se ajusta a 0 cuando
   * el usuario solicita reducción de movimiento, en cuyo caso el color cambia
   * de forma instantánea. La animación se aplica a los hijos `<button>` de
   * los marcadores para no tocar el viewport ni las capas vectoriales.
   */
  useGSAP(
    () => {
      const container = containerRef.current;
      if (!container) return;
      const targets = container.querySelectorAll('[data-spain-marker]');
      if (targets.length === 0) return;
      const duration = prefersReducedMotion() ? 0 : 0.35;
      gsap.fromTo(
        targets,
        { backgroundColor: 'inherit' },
        {
          backgroundColor: (_index: number, target: HTMLElement) =>
            target.dataset.bubbleColor ?? '#10b981',
          duration,
          ease: 'sine.out',
          overwrite: 'auto',
        }
      );
    },
    {
      scope: containerRef,
      dependencies: [activeLayer.id],
    }
  );

  const handleEnter = useCallback(
    (marker: MarkerPresentation) => (event: ReactPointerEvent<Element>) => {
      if (hideTooltipTimerRef.current !== null) {
        globalThis.clearTimeout(hideTooltipTimerRef.current);
        hideTooltipTimerRef.current = null;
      }
      const container = event.currentTarget.closest('[data-spain-map]') as HTMLElement | null;
      const rect = container?.getBoundingClientRect();
      const x = rect ? event.clientX - rect.left : event.clientX;
      const y = rect ? event.clientY - rect.top : event.clientY;
      setHovered({ marker, x, y });
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

  const hideTooltip = useCallback(() => {
    if (hideTooltipTimerRef.current !== null) {
      globalThis.clearTimeout(hideTooltipTimerRef.current);
    }
    hideTooltipTimerRef.current = globalThis.setTimeout(() => {
      setHovered(null);
      hideTooltipTimerRef.current = null;
    }, 140);
  }, []);

  const keepTooltipOpen = useCallback(() => {
    if (hideTooltipTimerRef.current !== null) {
      globalThis.clearTimeout(hideTooltipTimerRef.current);
      hideTooltipTimerRef.current = null;
    }
  }, []);

  const handleLeave = hideTooltip;

  const mapStyle = offline ? FALLBACK_STYLE : OPENFREEMAP_STYLE;

  return (
    <section
      ref={(node) => {
        containerRef.current = node;
      }}
      data-spain-map
      data-active-layer={activeLayer.id}
      aria-label={ariaLabel}
      className={[
        'relative h-full min-h-[360px] w-full overflow-hidden rounded-[20px] bg-[var(--color-surface-muted)]',
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
              data-spain-marker
              data-bubble-color={marker.color}
              aria-label={`${marker.name}: ${resolvedLabel} ${marker.value.toLocaleString('es-ES')}${resolvedUnit}`}
              className="focus-visible:ring-brand-300 relative flex items-center justify-center rounded-full border-2 border-white/95 font-bold text-white tabular-nums transition-transform hover:scale-110 focus-visible:scale-110 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
              style={{
                width: marker.radius,
                height: marker.radius,
                backgroundColor: marker.color,
                boxShadow: '0 6px 18px -6px rgba(6, 95, 70, 0.55)',
                fontSize: Math.max(10, marker.radius * 0.42),
              }}
              onPointerEnter={handleEnter(marker)}
              onPointerMove={handleMove}
              onPointerLeave={handleLeave}
              onClick={() => {
                if (onMarkerSelect) {
                  onMarkerSelect(marker.id);
                }
              }}
              onFocus={(event) => {
                const container = event.currentTarget.closest(
                  '[data-spain-map]'
                ) as HTMLElement | null;
                const rect = container?.getBoundingClientRect();
                const btn = event.currentTarget.getBoundingClientRect();
                const x = rect ? btn.left + btn.width / 2 - rect.left : btn.left;
                const y = rect ? btn.top - rect.top : btn.top;
                setHovered({ marker, x, y });
              }}
              onBlur={handleLeave}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-1 rounded-full opacity-80"
                style={{
                  background:
                    'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.55), transparent 60%)',
                }}
              />
              {marker.radius >= 24 ? (
                <span aria-hidden="true" className="relative leading-none drop-shadow-sm">
                  {marker.score}
                </span>
              ) : null}
            </button>
          </Marker>
        ))}
      </Map>

      {hovered ? (
        enrichedTooltip ? (
          <MarkerRichTooltip
            marker={{
              id: hovered.marker.id,
              name: hovered.marker.name,
              score: hovered.marker.score,
              value: hovered.marker.value,
              province: hovered.marker.province,
              indicators: hovered.marker.indicators?.map((indicator) => ({
                id: indicator.id,
                label: indicator.label,
                value: indicator.value,
                unit: indicator.unit,
              })),
            }}
            x={hovered.x}
            y={hovered.y}
            layerLabel={resolvedLabel}
            unit={resolvedUnit}
            activeIndicatorId={activeLayer.id === 'score' ? undefined : activeLayer.id}
            onOpenSheet={onMarkerSelect}
            onPointerEnter={keepTooltipOpen}
            onPointerLeave={hideTooltip}
          />
        ) : (
          <MapTooltip
            name={hovered.marker.name}
            value={hovered.marker.value}
            score={hovered.marker.score}
            x={hovered.x}
            y={hovered.y}
            unit={resolvedUnit}
            layerLabel={resolvedLabel}
            activeIndicatorId={activeLayer.id === 'score' ? undefined : activeLayer.id}
            indicators={hovered.marker.indicators}
            province={hovered.marker.province}
          />
        )
      ) : null}

      {hideLegend ? null : (
        <MapLegend
          label={resolvedLabel}
          stops={legendStops}
          unit={resolvedUnit}
          domain={domain}
          description={layerId ? activeLayer.description : undefined}
          className="absolute bottom-4 left-4"
        />
      )}
    </section>
  );
}
