import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type ElementType,
  type PointerEvent,
  type ReactNode,
} from 'react';
import gsap from 'gsap';

import { CARD_CONIC_ROTATION_S, prefersReducedMotion } from '@/animations';

type HTMLSpanElement = globalThis.HTMLSpanElement;

export interface CardConicProps {
  /** Contenido envuelto. */
  children: ReactNode;
  /** Tag HTML de la raíz. Por defecto `<div>`. */
  as?: ElementType;
  /** Color inicial del gradiente conic. */
  fromColor?: string;
  /** Color final del gradiente conic. */
  toColor?: string;
  /** Color "transparente" entre paradas, por defecto `transparent`. */
  voidColor?: string;
  /** Duración (s) de una vuelta completa. Por defecto 8 s. */
  rotationDuration?: number;
  /** Desactiva el efecto sin afectar al layout. */
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Wrapper que aplica un gradiente conic animado en hover/focus. Cuando
 * el usuario apunta a la card, una capa absoluta entra en escena (con
 * un fade muy corto) y rota 360° cada `rotationDuration` segundos para
 * sugerir un halo continuo cobre→moss.
 *
 * Detalles importantes:
 *   - El gradiente vive en una capa decorativa (`aria-hidden`) para no
 *     manchar el árbol semántico ni los lectores de pantalla.
 *   - La rotación se hace con `gsap` sobre `--card-conic-angle` usando
 *     `CSS.registerProperty` cuando está disponible, recurriendo a un
 *     fallback con `transform: rotate` si no.
 *   - Respeta `prefers-reduced-motion`: en ese caso no se rota y se
 *     reduce ligeramente la opacidad para señalar el hover sin marear.
 */
export function CardConic({
  children,
  as,
  fromColor = 'var(--color-copper-500, #B87333)',
  toColor = 'var(--color-moss-500, #4F8267)',
  voidColor = 'transparent',
  rotationDuration = CARD_CONIC_ROTATION_S,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: CardConicProps) {
  const overlayRef = useRef<HTMLSpanElement | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);

  const start = useCallback(() => {
    if (disabled) return;
    const node = overlayRef.current;
    if (!node) return;
    const reducedMotion = prefersReducedMotion();
    gsap.to(node, {
      opacity: reducedMotion ? 0.5 : 1,
      duration: 0.32,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    if (reducedMotion) return;
    if (tweenRef.current) tweenRef.current.kill();
    // Animamos una variable CSS para que el gradiente conic real se
    // calcule en GPU sin recomposiciones de layout.
    tweenRef.current = gsap.to(node, {
      '--card-conic-angle': '360deg',
      duration: rotationDuration,
      ease: 'none',
      repeat: -1,
      modifiers: {
        // Reseteamos cada vuelta para evitar acumulación tras horas en
        // pantalla y mantener el ángulo dentro de [0, 360).
        '--card-conic-angle': (value: string) => {
          const numeric = parseFloat(value);
          return `${numeric % 360}deg`;
        },
      },
    });
  }, [disabled, rotationDuration]);

  const stop = useCallback(() => {
    const node = overlayRef.current;
    if (!node) return;
    if (tweenRef.current) {
      tweenRef.current.kill();
      tweenRef.current = null;
    }
    gsap.to(node, {
      opacity: 0,
      duration: 0.32,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, []);

  useEffect(
    () => () => {
      // Cleanup global: si el componente se desmonta detenemos el loop
      // y limpiamos la variable CSS para no manchar otros consumidores.
      if (tweenRef.current) {
        tweenRef.current.kill();
        tweenRef.current = null;
      }
      const node = overlayRef.current;
      if (node) {
        gsap.killTweensOf(node);
        node.style.removeProperty('--card-conic-angle');
        node.style.removeProperty('opacity');
      }
    },
    []
  );

  const handleEnter = useCallback((_event: PointerEvent<HTMLElement>) => start(), [start]);
  const handleLeave = useCallback((_event: PointerEvent<HTMLElement>) => stop(), [stop]);
  const handleFocus = useCallback(() => start(), [start]);
  const handleBlur = useCallback(() => stop(), [stop]);

  const Component = (as ?? 'div') as ElementType;
  const overlayStyle: CSSProperties & Record<string, string> = {
    '--card-conic-angle': '0deg',
    background: `conic-gradient(from var(--card-conic-angle) at 50% 50%, ${fromColor}, ${voidColor} 30%, ${toColor} 60%, ${voidColor} 80%, ${fromColor})`,
  };

  return (
    <Component
      className={className}
      data-motion="card-conic"
      data-conic-disabled={disabled ? 'true' : undefined}
      aria-label={ariaLabel}
      onPointerEnter={handleEnter}
      onPointerLeave={handleLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{ position: 'relative', isolation: 'isolate' }}
    >
      <span
        ref={overlayRef}
        aria-hidden="true"
        data-testid="card-conic-overlay"
        style={{
          ...overlayStyle,
          position: 'absolute',
          inset: -1,
          borderRadius: 'inherit',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: 0,
          mixBlendMode: 'soft-light',
        }}
      />
      <span style={{ position: 'relative', zIndex: 1, display: 'block' }}>{children}</span>
    </Component>
  );
}
