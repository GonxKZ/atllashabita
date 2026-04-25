/* eslint-disable no-undef -- HTMLSpanElement, KeyboardEvent, HTMLInputElement y HTMLTextAreaElement son globales DOM. */
/**
 * RichLegend — leyenda flotante "pill" en el borde inferior del mapa.
 *
 * Sustituye visualmente a `MapLegend` cuando el mapa está en modo Atelier
 * (fullscreen). Aporta sobre la leyenda clásica:
 *
 *  - Forma de pastilla con backdrop-blur, posicionada bajo-centro.
 *  - Dominio numérico animado: el texto del rango se interpola entre el
 *    valor anterior y el nuevo cuando cambia la capa.
 *  - Atajos `[` y `]` para retroceder/avanzar de capa.
 *  - Botón de visibilidad coordinado con `useUiStore.legendOpen`.
 *
 * SOLID:
 *  - SRP: el componente sólo presenta y conecta atajos. La rampa, dominio
 *    y stops se calculan fuera (catálogo) y se pasan como props.
 *  - DI: el orden de capas y la capa activa son controlados desde fuera
 *    para que `DashboardShell` o cualquier consumidor pueda decidir qué
 *    capa anteceder/seguir.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, EyeOff } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { cn } from '@/components/ui/cn';
import { useUiStore } from '@/state/ui';
import { resolveDuration } from '@/animations';
import {
  MAP_LAYER_CATALOG,
  type LayerDomain,
  type LayerLegendStop,
  type MapLayerDefinition,
  type MapLayerId,
} from '@/features/map/layers/catalog';

export interface RichLegendProps {
  /** Capa activa cuya rampa se muestra. */
  readonly layer: MapLayerDefinition;
  /** Stops calculados (o por defecto se construyen desde la capa). */
  readonly stops: readonly LayerLegendStop[];
  /** Dominio observado de la capa. */
  readonly domain: LayerDomain;
  /** Callback de cambio de capa (usado por los atajos `[` / `]`). */
  readonly onLayerChange: (layerId: MapLayerId) => void;
  /** Catálogo de capas a usar para los atajos (por defecto, el global). */
  readonly catalog?: readonly MapLayerDefinition[];
  /** Sobreescribe la visibilidad (útil en tests/storybook). */
  readonly forcedOpen?: boolean;
  readonly className?: string;
}

function formatBoundary(value: number, unit: string): string {
  const trimmed = unit.trim();
  const formatted = Number.isInteger(value)
    ? value.toLocaleString('es-ES')
    : value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
  if (!trimmed) return formatted;
  if (/^[€%°]/.test(trimmed)) return `${formatted}${trimmed}`;
  return `${formatted}${unit}`;
}

export function RichLegend({
  layer,
  stops,
  domain,
  onLayerChange,
  catalog = MAP_LAYER_CATALOG,
  forcedOpen,
  className,
}: RichLegendProps) {
  const open = useUiStore((state) => state.legendOpen);
  const toggleLegend = useUiStore((state) => state.toggleLegend);
  const isOpen = forcedOpen ?? open;

  // Interpolación de los textos de mín/máx para que cambien con suavidad
  // cuando el usuario rota de capa con `[`/`]`.
  const minRef = useRef<HTMLSpanElement | null>(null);
  const maxRef = useRef<HTMLSpanElement | null>(null);
  const [displayedMin, setDisplayedMin] = useState(domain.min);
  const [displayedMax, setDisplayedMax] = useState(domain.max);

  useEffect(() => {
    setDisplayedMin(domain.min);
    setDisplayedMax(domain.max);
  }, [layer.id, domain.min, domain.max]);

  useGSAP(
    () => {
      const duration = resolveDuration(0.45);
      if (duration === 0) {
        setDisplayedMin(domain.min);
        setDisplayedMax(domain.max);
        return;
      }
      gsap.to(
        { value: displayedMin },
        {
          value: domain.min,
          duration,
          ease: 'power1.out',
          onUpdate() {
            setDisplayedMin(this.targets()[0].value as number);
          },
        }
      );
      gsap.to(
        { value: displayedMax },
        {
          value: domain.max,
          duration,
          ease: 'power1.out',
          onUpdate() {
            setDisplayedMax(this.targets()[0].value as number);
          },
        }
      );
      // displayedMin/Max no son dependencias para evitar bucles; sólo
      // `domain` y `layer.id` disparan la animación.
    },
    { dependencies: [domain.min, domain.max, layer.id] }
  );

  const cyclingCatalog = useMemo(
    () => (catalog.length > 0 ? catalog : MAP_LAYER_CATALOG),
    [catalog]
  );

  const cycleLayer = useCallback(
    (direction: 1 | -1) => {
      const index = cyclingCatalog.findIndex((entry) => entry.id === layer.id);
      const safeIndex = index >= 0 ? index : 0;
      const nextIndex = (safeIndex + direction + cyclingCatalog.length) % cyclingCatalog.length;
      onLayerChange(cyclingCatalog[nextIndex].id);
    },
    [cyclingCatalog, layer.id, onLayerChange]
  );

  // Atajos `[` y `]` se registran globalmente cuando la leyenda está
  // abierta. Si está cerrada, devolvemos el control al resto de la app
  // para no comer pulsaciones que no se perciben.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (event.key === '[') {
        event.preventDefault();
        cycleLayer(-1);
      } else if (event.key === ']') {
        event.preventDefault();
        cycleLayer(1);
      }
    };
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [isOpen, cycleLayer]);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={toggleLegend}
        data-feature="rich-legend"
        data-state="collapsed"
        aria-label="Mostrar leyenda"
        style={{ zIndex: 'var(--z-overlay-quiet)' as unknown as number }}
        className={cn(
          'pointer-events-auto absolute bottom-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full',
          'border border-white/40 bg-white/85 px-4 py-2 text-[11px] font-semibold text-[var(--color-ink-700)] shadow-[var(--shadow-card)] backdrop-blur',
          'focus-visible:ring-brand-300 hover:bg-white focus-visible:ring-2 focus-visible:outline-none',
          className
        )}
      >
        Mostrar leyenda · Pulsa <kbd className="font-mono">[</kbd> o{' '}
        <kbd className="font-mono">]</kbd> para cambiar de capa
      </button>
    );
  }

  return (
    <section
      data-feature="rich-legend"
      data-state="expanded"
      data-testid="rich-legend"
      aria-label={`Leyenda: ${layer.label}`}
      style={{ zIndex: 'var(--z-overlay-quiet)' as unknown as number }}
      className={cn(
        'pointer-events-auto absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3',
        'rounded-full border border-white/40 bg-white/90 py-2 pr-2 pl-4 shadow-[var(--shadow-elevated)] backdrop-blur',
        className
      )}
    >
      <button
        type="button"
        onClick={() => cycleLayer(-1)}
        aria-label="Capa anterior"
        data-testid="rich-legend-prev"
        className="text-ink-500 hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-brand-300 inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ChevronLeft size={14} aria-hidden="true" />
      </button>
      <div className="flex min-w-0 flex-col">
        <span className="text-ink-700 truncate text-xs font-semibold tracking-wide">
          {layer.label}
        </span>
        <div className="mt-1 flex items-center gap-2 text-[10px] tabular-nums">
          <span ref={minRef} data-testid="rich-legend-min" className="text-ink-500">
            {formatBoundary(displayedMin, layer.unit)}
          </span>
          <span
            aria-hidden="true"
            className="block h-2 w-32 rounded-full"
            style={{
              background: `linear-gradient(to right, ${stops
                .map((stop) => stop.color)
                .reverse()
                .join(', ')})`,
            }}
          />
          <span ref={maxRef} data-testid="rich-legend-max" className="text-ink-500">
            {formatBoundary(displayedMax, layer.unit)}
          </span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => cycleLayer(1)}
        aria-label="Capa siguiente"
        data-testid="rich-legend-next"
        className="text-ink-500 hover:bg-brand-50 hover:text-brand-700 focus-visible:ring-brand-300 inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <ChevronRight size={14} aria-hidden="true" />
      </button>
      <span className="border-line-soft text-ink-400 ml-1 hidden border-l pl-2 text-[10px] sm:inline">
        Pulsa <kbd className="text-ink-700 font-mono">[</kbd> o{' '}
        <kbd className="text-ink-700 font-mono">]</kbd> para cambiar de capa
      </span>
      <button
        type="button"
        onClick={toggleLegend}
        aria-label="Ocultar leyenda"
        data-testid="rich-legend-hide"
        className="text-ink-400 hover:bg-surface-muted hover:text-ink-700 focus-visible:ring-brand-300 inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors focus-visible:ring-2 focus-visible:outline-none"
      >
        <EyeOff size={14} aria-hidden="true" />
      </button>
    </section>
  );
}
