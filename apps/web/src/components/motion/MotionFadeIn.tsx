import { useRef, type ElementType, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { DURATION_DEFAULT, EASE_IN_OUT, FADE_IN_OFFSET, resolveDuration } from '@/animations';

export interface MotionFadeInProps {
  /** Contenido a animar. */
  children: ReactNode;
  /** Etiqueta HTML. Por defecto `div`. */
  as?: ElementType;
  /** Duración en segundos. */
  duration?: number;
  /** Retardo antes de iniciar la animación. */
  delay?: number;
  /** Desplazamiento vertical inicial (positivo = entra desde abajo). */
  y?: number;
  /** Permite desactivar la animación (útil para tests visuales). */
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Wrapper que aplica un `fade-in` con ligero desplazamiento vertical a sus
 * hijos usando GSAP. Respeta `prefers-reduced-motion`: en ese caso la
 * duración se colapsa a 0 y el estado final se aplica de inmediato.
 *
 * Se anota con `data-motion` para que los tests puedan comprobar que el
 * wrapper se renderiza aunque el entorno no soporte animaciones reales.
 */
export function MotionFadeIn({
  children,
  as,
  duration = DURATION_DEFAULT,
  delay = 0,
  y = FADE_IN_OFFSET,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: MotionFadeInProps) {
  const containerRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      if (disabled) return;
      const node = containerRef.current;
      if (!node) return;
      gsap.from(node, {
        opacity: 0,
        y,
        duration: resolveDuration(duration),
        delay,
        ease: EASE_IN_OUT,
        clearProps: 'transform,opacity',
      });
    },
    { scope: containerRef, dependencies: [disabled, duration, delay, y] }
  );

  const Component = (as ?? 'div') as ElementType;
  return (
    <Component
      ref={containerRef}
      className={className}
      data-motion="fade-in"
      aria-label={ariaLabel}
    >
      {children}
    </Component>
  );
}
