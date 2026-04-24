/**
 * Helpers para detectar `prefers-reduced-motion` y adaptar duraciones de
 * las animaciones GSAP. La filosofía es simple: si el usuario ha declarado
 * que prefiere reducir el movimiento, colapsamos las duraciones a un valor
 * testimonial (0) y evitamos transformaciones costosas. De este modo
 * respetamos la guía WCAG 2.1 success criterion 2.3.3.
 */

/** Media query canónica definida por el CSSOM. */
export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Devuelve `true` cuando el entorno soporta `matchMedia` y el usuario
 * solicita reducir el movimiento. Se aísla en una función pura para poder
 * simularla desde tests sin recurrir a JSDOM.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Ajusta una duración GSAP (en segundos) respetando `prefers-reduced-motion`.
 * Cuando la preferencia está activa devolvemos `0`, que en GSAP equivale a
 * saltar la animación y aplicar el estado final de inmediato. En caso
 * contrario, devolvemos la duración pasada por parámetro.
 */
export function resolveDuration(duration: number): number {
  return prefersReducedMotion() ? 0 : duration;
}

/**
 * Variante que permite indicar una duración alternativa cuando el usuario
 * prefiere reducir el movimiento (por ejemplo, un fade casi instantáneo en
 * lugar de eliminar la animación por completo).
 */
export function resolveDurationWithFallback(duration: number, reducedDuration: number): number {
  return prefersReducedMotion() ? reducedDuration : duration;
}
