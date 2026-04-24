import {
  useCallback,
  useRef,
  type ElementType,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DURATION_MICRO, EASE_MICRO, prefersReducedMotion, resolveDuration } from '@/animations';

export interface MotionScaleProps {
  /** Contenido a envolver. */
  children: ReactNode;
  /** Etiqueta HTML. Por defecto `div`. */
  as?: ElementType;
  /** Escala objetivo durante hover/focus. */
  scale?: number;
  /** Duración de la transición. */
  duration?: number;
  /**
   * Si es `true`, la animación se aplica con `gsap.from` al montar,
   * pudiendo servir para generar un "pop" al entrar.
   */
  popOnMount?: boolean;
  /** Desactiva la interacción visual. */
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Wrapper que proporciona microinteracciones de escala ante `hover` y
 * `focus`. Usa `transform` (nunca `top/left`) para mantener 60fps y
 * respeta `prefers-reduced-motion` evitando el efecto cuando está activo.
 */
export function MotionScale({
  children,
  as,
  scale = 1.03,
  duration = DURATION_MICRO,
  popOnMount = false,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: MotionScaleProps) {
  const containerRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      if (!popOnMount || disabled) return;
      const node = containerRef.current;
      if (!node) return;
      gsap.from(node, {
        scale: 0.94,
        opacity: 0,
        duration: resolveDuration(duration),
        ease: EASE_MICRO,
        clearProps: 'transform,opacity',
      });
    },
    {
      scope: containerRef,
      dependencies: [popOnMount, disabled, duration],
    }
  );

  const animateTo = useCallback(
    (value: number) => {
      if (disabled) return;
      if (prefersReducedMotion()) return;
      const node = containerRef.current;
      if (!node) return;
      gsap.to(node, {
        scale: value,
        duration,
        ease: EASE_MICRO,
        overwrite: 'auto',
      });
    },
    [disabled, duration]
  );

  const handleEnter = useCallback(
    (_event: PointerEvent<HTMLElement>) => animateTo(scale),
    [animateTo, scale]
  );

  const handleLeave = useCallback((_event: PointerEvent<HTMLElement>) => animateTo(1), [animateTo]);

  const handleFocus = useCallback(
    (_event: FocusEvent<HTMLElement>) => animateTo(scale),
    [animateTo, scale]
  );

  const handleBlur = useCallback((_event: FocusEvent<HTMLElement>) => animateTo(1), [animateTo]);

  const Component = (as ?? 'div') as ElementType;
  return (
    <Component
      ref={containerRef}
      className={className}
      data-motion="scale"
      aria-label={ariaLabel}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </Component>
  );
}
