/**
 * MiniMap — vista cartográfica real de España.
 *
 * El componente usa una segunda instancia compacta de MapLibre con el mismo
 * estilo base que el mapa principal. La versión anterior dibujaba una
 * silueta SVG esquemática y podía confundirse con un mapa real; aquí se
 * prioriza exactitud visual sobre decoración.
 */

import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';

import { cn } from '@/components/ui/cn';
import { useUiStore } from '@/state/ui';

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const FALLBACK_STYLE = {
  version: 8 as const,
  name: 'atlashabita-minimap-fallback',
  sources: {},
  layers: [
    {
      id: 'atlashabita-minimap-background',
      type: 'background' as const,
      paint: {
        'background-color': '#cfe7dc',
      },
    },
  ],
};

export interface MiniMapViewport {
  readonly minLon: number;
  readonly maxLon: number;
  readonly minLat: number;
  readonly maxLat: number;
}

export interface MiniMapProps {
  /** Viewport actual del mapa principal. Reservado para sincronización futura de cámara. */
  readonly viewport?: MiniMapViewport;
  /** Mostrar/ocultar minimap (los tests pueden forzar `true`). */
  readonly forcedVisible?: boolean;
  readonly className?: string;
  readonly ariaLabel?: string;
  /** Fuerza estilo local sin red para tests o entornos offline. */
  readonly offline?: boolean;
}

export function MiniMap({
  forcedVisible,
  className,
  ariaLabel = 'Mini-mapa real de España',
  offline = false,
}: MiniMapProps) {
  const isVisible = useUiStore((state) => state.miniMapOpen);
  const toggleMiniMap = useUiStore((state) => state.toggleMiniMap);
  const visible = forcedVisible ?? isVisible;

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
          'border border-white/55 bg-white/90 px-3 text-[11px] font-semibold text-[var(--color-ink-700)] shadow-[var(--shadow-card)] backdrop-blur',
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
        'pointer-events-auto absolute right-4 bottom-4 overflow-hidden rounded-[24px]',
        'border border-white/60 bg-white/90 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.58)] backdrop-blur',
        'w-[min(260px,calc(100%-2rem))]',
        className
      )}
    >
      <div
        data-testid="mini-map-real-map"
        className="pointer-events-none h-[148px] overflow-hidden rounded-t-[23px] bg-[color:var(--color-brand-50)]"
      >
        <Map
          initialViewState={{ longitude: -3.7, latitude: 40.05, zoom: 4.05 }}
          mapStyle={(offline ? FALLBACK_STYLE : OPENFREEMAP_STYLE) as unknown as string}
          attributionControl={false}
          interactive={false}
          dragPan={false}
          scrollZoom={false}
          doubleClickZoom={false}
          keyboard={false}
          boxZoom={false}
          dragRotate={false}
          pitchWithRotate={false}
          touchZoomRotate={false}
          reuseMaps
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      <figcaption className="text-ink-500 flex items-center justify-between gap-3 px-3 py-2 text-[10px] tracking-wide uppercase">
        <span className="font-semibold">Vista España</span>
        <button
          type="button"
          onClick={toggleMiniMap}
          aria-label="Ocultar mini-mapa"
          className="text-ink-500 hover:text-ink-900 focus-visible:ring-brand-300 rounded-full px-1.5 py-0.5 focus-visible:ring-2 focus-visible:outline-none"
          data-testid="mini-map-toggle"
        >
          Ocultar
        </button>
      </figcaption>
    </figure>
  );
}
