/**
 * Tooltip accesible sin dependencias externas.
 *
 * Implementa el patrón ARIA `aria-describedby`: el contenido de la pista se
 * monta junto al disparador, queda oculto a la vista hasta que recibe `hover`
 * o `focus` y se anuncia con `role="tooltip"`. La tecla `Esc` lo cierra.
 *
 * Diseño en español, alineado al sistema de colores de AtlasHabita. Está
 * pensado para enriquecer botones, badges o chips con datos no obvios sin
 * recargar la interfaz: por ejemplo "Suma de pesos: 1.00 (100% del perfil)".
 */
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
} from 'react';
import { cn } from './cn';

export type TooltipSide = 'top' | 'right' | 'bottom' | 'left';

export interface TooltipProps {
  /** Contenido visible en la burbuja flotante. */
  readonly content: ReactNode;
  /** Único hijo: el disparador (botón, icono, texto). */
  readonly children: ReactElement;
  /** Posición preferida; si no cabe el componente respetará igualmente la coloca. */
  readonly side?: TooltipSide;
  /** Retraso en milisegundos antes de mostrar. */
  readonly delayMs?: number;
  /** Forzar visible — útil para tests deterministas. */
  readonly open?: boolean;
  /** Clases extra para el panel flotante. */
  readonly className?: string;
}

const SIDE_STYLES: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

interface TriggerProps {
  onMouseEnter?: (event: unknown) => void;
  onMouseLeave?: (event: unknown) => void;
  onFocus?: (event: FocusEvent<HTMLElement>) => void;
  onBlur?: (event: FocusEvent<HTMLElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  'aria-describedby'?: string;
}

function composeHandler<E>(...handlers: Array<((event: E) => void) | undefined>) {
  return (event: E) => {
    for (const handler of handlers) {
      if (handler) handler(event);
    }
  };
}

export function Tooltip({
  content,
  children,
  side = 'top',
  delayMs = 120,
  open,
  className,
}: TooltipProps) {
  const child = Children.only(children);
  if (!isValidElement<TriggerProps>(child)) {
    throw new Error('Tooltip requires a single React element as child.');
  }
  const tooltipId = useId();
  const [visible, setVisible] = useState<boolean>(open ?? false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const show = useCallback(() => {
    if (open !== undefined) return;
    cancel();
    timerRef.current = setTimeout(() => setVisible(true), delayMs);
  }, [cancel, delayMs, open]);

  const hide = useCallback(() => {
    if (open !== undefined) return;
    cancel();
    setVisible(false);
  }, [cancel, open]);

  useEffect(() => {
    if (open !== undefined) {
      setVisible(open);
    }
  }, [open]);

  useEffect(() => () => cancel(), [cancel]);

  const triggerProps = (child.props ?? {}) as TriggerProps;
  const enhanced = cloneElement<TriggerProps>(child as ReactElement<TriggerProps>, {
    'aria-describedby': tooltipId,
    onMouseEnter: composeHandler(triggerProps.onMouseEnter, show),
    onMouseLeave: composeHandler(triggerProps.onMouseLeave, hide),
    onFocus: composeHandler<FocusEvent<HTMLElement>>(triggerProps.onFocus, show),
    onBlur: composeHandler<FocusEvent<HTMLElement>>(triggerProps.onBlur, hide),
    onKeyDown: composeHandler<KeyboardEvent<HTMLElement>>(triggerProps.onKeyDown, (event) => {
      if (event.key === 'Escape') hide();
    }),
  });

  return (
    <span className="relative inline-flex">
      {enhanced}
      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden={!visible}
        className={cn(
          'pointer-events-none absolute z-50 max-w-xs rounded-xl px-3 py-2 text-xs leading-snug shadow-[0_18px_36px_-22px_rgba(15,23,42,0.45)] transition-opacity',
          'bg-ink-900 text-white',
          'border border-[color:var(--color-line-soft)]/20',
          SIDE_STYLES[side],
          visible ? 'opacity-100' : 'opacity-0',
          className
        )}
      >
        {content}
      </span>
    </span>
  );
}
