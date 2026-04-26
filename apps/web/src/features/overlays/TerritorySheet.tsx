/* eslint-disable no-undef -- HTMLDivElement, KeyboardEvent y performance son globales DOM. */
/**
 * TerritorySheet — bottom-sheet con la ficha territorial.
 *
 * Drawer inferior con drag handle al estilo iOS / Material 3, tres puntos
 * de anclaje (15 / 55 / 92 % de la altura del viewport) y cierre por
 * `Escape`, drag-down o click en el backdrop. Renderiza la `TerritoryDetail`
 * existente, por lo que no duplica lógica de presentación: el drawer es
 * únicamente el "container" responsable del gesto y del foco.
 *
 * Estado:
 *  - Snap point activo (`peek`, `default`, `expanded`).
 *  - Offset de drag en píxeles para retroalimentar la interacción.
 *
 * Accesibilidad:
 *  - `role="dialog"` + `aria-modal` + `aria-labelledby` para SR.
 *  - Foco inicial atrapado en el handle (`tabIndex=0`) y `Escape` cierra.
 *  - Backdrop con `aria-hidden` para que SR no lo anuncie.
 *
 * Implementación pura del gesto (sin librería externa) para evitar añadir
 * dependencias. Si en futuras iteraciones se introduce
 * `react-aria-components`, los snap-points y el drag pueden delegarse en
 * `useDrag` sin alterar la API pública del componente.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '@/components/ui/cn';
import { TerritoryDetail } from '@/features/territory/TerritoryDetail';
import { NATIONAL_MUNICIPALITIES, type NationalMunicipality } from '@/data/national_mock';

/**
 * Snap points (porcentaje del viewport ocupado por el sheet). Se mantienen
 * como constantes para que los tests puedan asertar sobre el atributo
 * `data-snap`.
 */
export const SHEET_SNAP_POINTS = {
  peek: 18,
  default: 82,
  expanded: 92,
} as const;

export type SheetSnap = keyof typeof SHEET_SNAP_POINTS;

const SNAP_ORDER: SheetSnap[] = ['peek', 'default', 'expanded'];

/** Umbral en píxeles a partir del cual el drag actualiza el snap. */
const SNAP_DRAG_THRESHOLD = 60;
/** Velocidad mínima (px/ms) en la última muestra para forzar un snap rápido. */
const SNAP_VELOCITY_THRESHOLD = 0.6;

export interface TerritorySheetProps {
  /** Identificador del territorio activo. `null` mantiene el sheet cerrado. */
  readonly territoryId: string | null;
  /** Catálogo opcional para resolver el municipio (tests/mocks). */
  readonly data?: readonly NationalMunicipality[];
  /** Snap inicial cuando el sheet aparece. */
  readonly initialSnap?: SheetSnap;
  /** Callback al cerrar (Escape, drag-down, backdrop, botón X). */
  readonly onClose: () => void;
}

export function TerritorySheet({
  territoryId,
  data = NATIONAL_MUNICIPALITIES,
  initialSnap = 'default',
  onClose,
}: TerritorySheetProps) {
  const [snap, setSnap] = useState<SheetSnap>('default');
  const [dragOffset, setDragOffset] = useState(0);
  const dragStateRef = useRef<{ startY: number; lastY: number; lastT: number } | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  const isOpen = territoryId !== null;
  const municipality = isOpen ? (data.find((entry) => entry.id === territoryId) ?? null) : null;

  /*
   * Patrón "reset state when a prop changes" sin useEffect (react.dev:
   * https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes).
   * Detectamos el cambio de `territoryId` durante el render y restablecemos
   * snap/offset sin disparar un render adicional ni el warning
   * `react-doctor/no-cascading-set-state`.
   */
  const [trackedTerritoryId, setTrackedTerritoryId] = useState<string | null>(null);
  if (trackedTerritoryId !== territoryId) {
    setTrackedTerritoryId(territoryId);
    setDragOffset(0);
    if (territoryId !== null) {
      setSnap(initialSnap);
    }
  }

  /* `Escape` cierra el sheet. Sólo registramos el listener cuando está abierto
   * para no contaminar el árbol cuando no procede. NO usamos `stopPropagation`
   * para que el orquestador (RootLayout / useShortcuts) pueda decidir el orden
   * de cierre cuando convivan varios overlays. */
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
    };
  }, [isOpen, onClose]);

  /*
   * Foco inicial: cuando el sheet se abre y existe el contenedor, llevamos
   * el foco al handle para que SR y teclado entren en el componente sin
   * salir del flujo (cumple WCAG 2.4.3 - orden de foco).
   */
  useEffect(() => {
    if (!isOpen) return;
    const node = sheetRef.current;
    if (!node) return;
    const handle = node.querySelector<HTMLElement>('[data-sheet-handle]');
    handle?.focus();
  }, [isOpen]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    dragStateRef.current = {
      startY: event.clientY,
      lastY: event.clientY,
      lastT: performance.now(),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const state = dragStateRef.current;
    if (!state) return;
    state.lastY = event.clientY;
    state.lastT = performance.now();
    setDragOffset(event.clientY - state.startY);
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = dragStateRef.current;
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      if (!state) return;
      const delta = event.clientY - state.startY;
      const elapsed = Math.max(1, performance.now() - state.lastT);
      const velocity = (event.clientY - state.lastY) / elapsed;
      setDragOffset(0);

      // Drag hacia abajo cuando estamos en el snap más bajo cierra el drawer.
      if (snap === SNAP_ORDER[0] && delta > SNAP_DRAG_THRESHOLD) {
        onClose();
        return;
      }

      const direction = delta > 0 ? 1 : delta < 0 ? -1 : 0;
      const fastFlick = Math.abs(velocity) >= SNAP_VELOCITY_THRESHOLD ? direction : 0;
      const significantDrag = Math.abs(delta) >= SNAP_DRAG_THRESHOLD ? direction : 0;
      const moveBy = fastFlick !== 0 ? fastFlick : significantDrag;
      if (moveBy === 0) return;

      const currentIndex = SNAP_ORDER.indexOf(snap);
      const nextIndex = Math.min(SNAP_ORDER.length - 1, Math.max(0, currentIndex + moveBy));
      const nextSnap = SNAP_ORDER[nextIndex];
      if (nextSnap === snap && delta > SNAP_DRAG_THRESHOLD && snap === SNAP_ORDER[0]) {
        onClose();
        return;
      }
      setSnap(nextSnap);
    },
    [snap, onClose]
  );

  const handleHandleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const currentIndex = SNAP_ORDER.indexOf(snap);
      if (event.key === 'ArrowUp' || event.key === 'PageUp') {
        event.preventDefault();
        setSnap(SNAP_ORDER[Math.min(SNAP_ORDER.length - 1, currentIndex + 1)]);
      } else if (event.key === 'ArrowDown' || event.key === 'PageDown') {
        event.preventDefault();
        const nextIndex = currentIndex - 1;
        if (nextIndex < 0) {
          onClose();
        } else {
          setSnap(SNAP_ORDER[nextIndex]);
        }
      }
    },
    [snap, onClose]
  );

  if (!isOpen) {
    return null;
  }

  const heightPct = SHEET_SNAP_POINTS[snap];
  const offset = Math.max(0, dragOffset);
  // Texto descriptivo para SR; aporta contexto extra cuando estamos en el
  // snap minimo (peek), donde la siguiente pulsacion abajo cierra la ficha.
  const handleAriaValueText =
    snap === 'peek'
      ? `${snap} (${heightPct}%) — pulsa flecha abajo para cerrar la ficha`
      : `${snap} (${heightPct}%)`;

  return (
    <div
      data-feature="territory-sheet"
      role="presentation"
      style={{ zIndex: 'var(--z-overlay-dialog)' as unknown as number }}
      className="fixed inset-0 flex items-end justify-center p-2 sm:p-4"
    >
      <div
        aria-hidden="true"
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-[var(--color-ink-900)]/40 backdrop-blur-[2px] transition-opacity duration-200',
          snap === 'peek' ? 'opacity-50' : 'opacity-100'
        )}
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="territory-sheet-title"
        data-snap={snap}
        data-testid="territory-sheet"
        className={cn(
          'relative w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-[var(--shadow-elevated)]',
          'flex flex-col will-change-transform'
        )}
        style={{
          width: 'min(calc(100vw - 1rem), 56rem)',
          height: `${heightPct}dvh`,
          maxHeight: 'calc(100dvh - 1rem)',
          transform: `translate3d(0, ${offset}px, 0)`,
          transition:
            dragOffset === 0
              ? 'height 220ms cubic-bezier(0.32,0.72,0,1), transform 220ms cubic-bezier(0.32,0.72,0,1)'
              : 'none',
        }}
      >
        <div
          data-sheet-handle
          tabIndex={0}
          role="slider"
          aria-orientation="vertical"
          aria-valuemin={SHEET_SNAP_POINTS.peek}
          aria-valuemax={SHEET_SNAP_POINTS.expanded}
          aria-valuenow={heightPct}
          aria-valuetext={handleAriaValueText}
          aria-label="Arrastra hacia abajo para cerrar la ficha."
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onKeyDown={handleHandleKeyDown}
          className={cn(
            'flex shrink-0 cursor-grab touch-none items-center justify-center py-2 select-none active:cursor-grabbing',
            'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset'
          )}
        >
          <span aria-hidden="true" className="bg-ink-300/70 block h-1.5 w-12 rounded-full" />
        </div>

        <div className="flex shrink-0 items-start justify-between gap-3 px-6 pt-1 pb-3">
          <div className="min-w-0">
            <p className="text-ink-500 text-[11px] font-semibold tracking-[0.16em] uppercase">
              Ficha territorial
            </p>
            <h2
              id="territory-sheet-title"
              className="font-display text-ink-900 truncate text-xl font-bold"
            >
              {municipality?.name ?? 'Territorio'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ficha territorial"
            data-testid="territory-sheet-close"
            className={cn(
              'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
              'text-ink-500 hover:text-ink-900 bg-surface-soft hover:bg-surface-muted transition-colors',
              'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:outline-none'
            )}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
          {municipality ? (
            <TerritoryDetail municipality={municipality} data={data} />
          ) : (
            <p className="text-ink-500 text-sm">No se ha encontrado el territorio seleccionado.</p>
          )}
        </div>
      </div>
    </div>
  );
}
