/* eslint-disable no-undef -- React (CSS) y Node son globales DOM. */
/**
 * FloatingRanking — overlay flotante con el ranking sobre el mapa.
 *
 * Encapsula el `RankingPanel` existente en una "card glass" anclada al
 * borde izquierdo del mapa. El comportamiento sigue el spec del Atelier
 * (M12 · issue #118):
 *
 *  - Tamaño objetivo 380×min(70vh, 720px) cuando está expandido.
 *  - Pinable: el usuario puede anclarlo (`isRankingPinned`) para evitar
 *    el autocollapse a la barra de 56 px tras 6 s sin foco.
 *  - Autocollapse cuando deja de tener foco/hover y el usuario no lo
 *    ha pinchado (cumple el patrón "discreto pero accesible" del Atelier).
 *  - Glassmorphism con backdrop-blur y borde tenue, alineado con la
 *    pixel-grid de tokens.
 *
 * SOLID:
 *  - SRP: el componente sólo orquesta visibilidad/pin/foco. La lógica de
 *    ranking sigue en `RankingPanel`.
 *  - Open/Closed: acepta `children` opcionales para sustituir el panel
 *    por una vista alternativa en tests/storybook sin tocar el wrapper.
 *  - Dependency inversion: el estado de `pin` se delega en `useUiStore`
 *    para que cualquier consumidor pueda controlarlo (atajos, command
 *    palette, tests) sin acoplarse al árbol React.
 */

import { Pin, PinOff } from 'lucide-react';
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/components/ui/cn';
import { RankingPanel } from '@/features/ranking';
import { useUiStore } from '@/state/ui';

/** Milisegundos sin foco antes de autocollapsar el panel. */
const AUTO_COLLAPSE_DELAY_MS = 6_000;

export interface FloatingRankingProps {
  /** Permite inyectar contenido alternativo (tests/storybook). */
  readonly children?: ReactNode;
  /** Etiqueta accesible del wrapper. */
  readonly ariaLabel?: string;
  /** Sobreescribe el estado de auto-colapso (tests). */
  readonly forcedExpanded?: boolean;
  readonly className?: string;
}

export function FloatingRanking({
  children,
  ariaLabel = 'Ranking de municipios',
  forcedExpanded,
  className,
}: FloatingRankingProps) {
  const isPinned = useUiStore((state) => state.isRankingPinned);
  const togglePinned = useUiStore((state) => state.toggleRankingPinned);

  // Estado local de expansión: true = tarjeta plena, false = barra colapsada.
  const [expanded, setExpanded] = useState(true);
  const titleId = useId();
  const containerRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const effectiveExpanded = forcedExpanded ?? expanded;

  /*
   * Programa el auto-colapso: si el panel no está pinchado y el usuario
   * no lo está enfocando ni lo cubre con el ratón, plegamos la tarjeta
   * tras `AUTO_COLLAPSE_DELAY_MS` para devolver el foco visual al mapa.
   */
  const scheduleCollapse = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (isPinned) return;
    timerRef.current = setTimeout(() => {
      setExpanded(false);
      timerRef.current = null;
    }, AUTO_COLLAPSE_DELAY_MS);
  }, [isPinned]);

  const cancelCollapse = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Si pasa a estar pinchado, lo abrimos automáticamente y cancelamos
  // cualquier temporizador en vuelo.
  useEffect(() => {
    if (isPinned) {
      setExpanded(true);
      cancelCollapse();
      return;
    }
    scheduleCollapse();
    return cancelCollapse;
  }, [isPinned, scheduleCollapse, cancelCollapse]);

  const handleEnter = useCallback(() => {
    cancelCollapse();
    setExpanded(true);
  }, [cancelCollapse]);

  const handleLeave = useCallback(() => {
    if (isPinned) return;
    scheduleCollapse();
  }, [isPinned, scheduleCollapse]);

  const wrapperStyle = useMemo<React.CSSProperties>(
    () => ({ zIndex: 'var(--z-overlay-quiet)' as unknown as number }),
    []
  );

  return (
    <aside
      ref={(node) => {
        containerRef.current = node;
      }}
      aria-label={ariaLabel}
      data-feature="floating-ranking"
      data-state={effectiveExpanded ? 'expanded' : 'collapsed'}
      data-pinned={isPinned ? 'true' : 'false'}
      style={wrapperStyle}
      className={cn(
        'pointer-events-auto absolute top-4 left-4 flex flex-col overflow-hidden rounded-2xl',
        'border border-white/40 bg-white/80 shadow-[var(--shadow-elevated)] backdrop-blur',
        'transition-[width,height] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
        effectiveExpanded
          ? 'h-[min(70vh,720px)] w-[380px]'
          : 'h-14 w-[380px] hover:h-14 hover:w-[380px]',
        className
      )}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      onFocusCapture={handleEnter}
      onBlurCapture={(event) => {
        // Sólo recolapsamos si el foco abandona por completo el panel.
        if (containerRef.current && !containerRef.current.contains(event.relatedTarget as Node)) {
          handleLeave();
        }
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/40 px-4 py-2">
        <div className="flex min-w-0 flex-col">
          <span
            id={titleId}
            className="text-ink-700 text-[11px] font-semibold tracking-[0.16em] uppercase"
          >
            Ranking nacional
          </span>
          <span className="text-ink-500 truncate text-[11px]">
            Pinchar en el mapa para abrir la ficha del municipio.
          </span>
        </div>
        <button
          type="button"
          onClick={togglePinned}
          aria-pressed={isPinned}
          aria-label={isPinned ? 'Desanclar ranking' : 'Anclar ranking'}
          data-testid="floating-ranking-pin"
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors',
            'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:outline-none',
            isPinned
              ? 'bg-brand-500 text-white shadow-sm'
              : 'text-ink-500 hover:bg-brand-50 hover:text-brand-700 bg-white/70'
          )}
        >
          {isPinned ? (
            <PinOff size={14} aria-hidden="true" />
          ) : (
            <Pin size={14} aria-hidden="true" />
          )}
        </button>
      </header>

      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-4',
          // Cuando colapsa, ocultamos el cuerpo para reducir la huella visual.
          effectiveExpanded ? 'opacity-100' : 'pointer-events-none h-0 opacity-0'
        )}
        aria-hidden={!effectiveExpanded}
      >
        {children ?? <RankingPanel className="border-none bg-transparent shadow-none" />}
      </div>
    </aside>
  );
}
