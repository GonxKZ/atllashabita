import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type ElementType,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  type Ref,
} from 'react';
import gsap from 'gsap';

import { EASINGS, MAGNETIC_RADIUS_PX, MAGNETIC_STRENGTH, prefersReducedMotion } from '@/animations';

export interface MotionMagneticProps {
  /** Contenido (CTA, action card, icon button…). */
  children: ReactNode;
  /** Etiqueta HTML por defecto `div`. */
  as?: ElementType;
  /** Radio en píxeles dentro del cual se atrae el elemento. */
  radius?: number;
  /** Factor 0..1 que controla cuánto se desplaza el contenido. */
  strength?: number;
  /** Desactiva la atracción magnética sin retirar el wrapper. */
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/**
 * Wrapper que aplica un efecto "cursor magnético" sobre CTAs y action
 * cards: cuando el puntero entra en un radio configurable, el elemento
 * desliza una fracción de la distancia para invitar al click. Usa
 * `gsap.quickTo` para mantener un loop fluido (60fps) sin generar
 * tweens nuevos en cada `pointermove`.
 *
 * Respeta `prefers-reduced-motion`: en ese caso no aplica desplazamiento
 * y se comporta como un wrapper transparente. También resetea la
 * posición al salir o perder el foco para evitar offsets persistentes.
 */
export const MotionMagnetic = forwardRef(function MotionMagnetic(
  {
    children,
    as,
    radius = MAGNETIC_RADIUS_PX,
    strength = MAGNETIC_STRENGTH,
    disabled = false,
    className,
    'aria-label': ariaLabel,
  }: MotionMagneticProps,
  forwardedRef: Ref<HTMLElement>
) {
  const elementRef = useRef<HTMLElement | null>(null);
  // `quickTo` es una factoría perezosa: la creamos una vez por
  // dimensión para que cada `pointermove` llame a una función nativa
  // y GSAP coloque el valor en el siguiente frame sin instanciar
  // tweens nuevos.
  const quickXRef = useRef<gsap.QuickToFunc | null>(null);
  const quickYRef = useRef<gsap.QuickToFunc | null>(null);

  // Permitimos al consumidor obtener el nodo si necesita medirlo (p.ej.
  // foco programático) sin renunciar a la encapsulación interna.
  useImperativeHandle(forwardedRef, () => elementRef.current as HTMLElement, []);

  useEffect(() => {
    const node = elementRef.current;
    if (!node) return undefined;
    quickXRef.current = gsap.quickTo(node, 'x', {
      duration: 0.35,
      ease: EASINGS.smooth,
    });
    quickYRef.current = gsap.quickTo(node, 'y', {
      duration: 0.35,
      ease: EASINGS.smooth,
    });
    return () => {
      // Cleanup explícito: si el componente se desmonta mientras el
      // tween está en vuelo, evitamos warnings de GSAP y limpiamos las
      // transformaciones residuales.
      gsap.killTweensOf(node);
      gsap.set(node, { x: 0, y: 0, clearProps: 'transform' });
      quickXRef.current = null;
      quickYRef.current = null;
    };
  }, []);

  const settle = useCallback(() => {
    if (!quickXRef.current || !quickYRef.current) return;
    quickXRef.current(0);
    quickYRef.current(0);
  }, []);

  const handleMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (disabled) return;
      if (prefersReducedMotion()) return;
      const node = elementRef.current;
      if (!node || !quickXRef.current || !quickYRef.current) return;

      const rect = node.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = event.clientX - cx;
      const dy = event.clientY - cy;
      const distance = Math.hypot(dx, dy);

      // Si el cursor está fuera del radio configurado relajamos el
      // wrapper hacia la posición original. De este modo el efecto solo
      // se siente cuando el usuario está realmente cerca del CTA.
      if (distance > radius) {
        settle();
        return;
      }
      quickXRef.current(dx * strength);
      quickYRef.current(dy * strength);
    },
    [disabled, radius, settle, strength]
  );

  const handleLeave = useCallback((_event: PointerEvent<HTMLElement>) => settle(), [settle]);

  const handleBlur = useCallback((_event: FocusEvent<HTMLElement>) => settle(), [settle]);

  const Component = (as ?? 'div') as ElementType;
  return (
    <Component
      ref={(node: HTMLElement | null) => {
        elementRef.current = node;
      }}
      className={className}
      data-motion="magnetic"
      data-magnetic-disabled={disabled ? 'true' : undefined}
      aria-label={ariaLabel}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onBlur={handleBlur}
    >
      {children}
    </Component>
  );
});
