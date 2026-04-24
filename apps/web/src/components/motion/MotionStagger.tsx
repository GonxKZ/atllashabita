import { useRef, type ElementType, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import {
  DURATION_DEFAULT,
  EASE_IN_OUT,
  FADE_IN_OFFSET,
  STAGGER_DEFAULT,
  resolveDuration,
} from '@/animations';

export interface MotionStaggerProps {
  /** Hijos que deben animarse en cascada. */
  children: ReactNode;
  /** Etiqueta HTML. Por defecto `div`. */
  as?: ElementType;
  /** Duración de cada animación individual. */
  duration?: number;
  /** Retardo entre hijos (segundos). */
  stagger?: number;
  /** Retardo global antes de iniciar la cascada. */
  delay?: number;
  /** Desplazamiento vertical inicial. */
  y?: number;
  /**
   * Selector para elegir qué hijos animar dentro del scope. Cuando se
   * omite, usamos los hijos directos (`node.children`) sin depender del
   * combinator `>` que algunos entornos de test no toleran.
   */
  selector?: string;
  /** Desactiva la animación (sin afectar al render). */
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Aplica una animación de entrada en cascada a sus hijos directos.
 * Respeta `prefers-reduced-motion`.
 */
export function MotionStagger({
  children,
  as,
  duration = DURATION_DEFAULT,
  stagger = STAGGER_DEFAULT,
  delay = 0,
  y = FADE_IN_OFFSET,
  selector,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: MotionStaggerProps) {
  const containerRef = useRef<HTMLElement | null>(null);

  useGSAP(
    () => {
      if (disabled) return;
      const node = containerRef.current;
      if (!node) return;
      const targets: Element[] = selector
        ? Array.from(node.querySelectorAll(selector))
        : Array.from(node.children);
      if (targets.length === 0) return;
      gsap.from(targets, {
        opacity: 0,
        y,
        duration: resolveDuration(duration),
        delay,
        stagger,
        ease: EASE_IN_OUT,
        clearProps: 'transform,opacity',
      });
    },
    {
      scope: containerRef,
      dependencies: [disabled, duration, stagger, delay, y, selector],
    }
  );

  const Component = (as ?? 'div') as ElementType;
  return (
    <Component
      ref={containerRef}
      className={className}
      data-motion="stagger"
      aria-label={ariaLabel}
    >
      {children}
    </Component>
  );
}
