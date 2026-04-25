/**
 * Tokens y presets de motion del sistema "AtlasHabita Atelier".
 *
 * Centralizamos las duraciones, curvas Bézier y patrones de stagger del
 * lenguaje visual lush para que cualquier microinteracción los importe
 * de un único origen y respete las directrices del milestone M12.
 *
 * Reglas de oro (issue #117):
 *   - Respetar `prefers-reduced-motion`: en ese caso colapsamos la
 *     duración a `instant` y eliminamos el desplazamiento orgánico.
 *   - Animar SOLO `transform`, `opacity` y `clip-path`. Nunca tocamos
 *     `top`/`left` para mantener 60fps en el repintado.
 *   - El cleanup lo gestiona `useGSAP` en cada consumidor; aquí sólo
 *     exponemos primitivas puras y helpers ergonómicos.
 */
import { prefersReducedMotion } from './reducedMotion';

/**
 * Tipado mínimo para `gsap.TweenVars` sin importar el namespace
 * completo (evita pagar el coste del módulo cuando algunos consumidores
 * sólo necesitan los tokens). Las claves coinciden con la API pública
 * de GSAP que utilizamos.
 */
type TweenVarsLike = Record<string, unknown>;

/**
 * Duraciones canónicas en segundos. Coinciden con el spec del Atelier:
 *   - `instant`: microinteracciones casi imperceptibles (hover, ticks).
 *   - `base`:    transición estándar, suficiente para captar el cambio.
 *   - `lush`:    reveals densos (markers, cards, tooltips contextuales).
 *   - `hero`:    secuencias hero (intro de sección, paneo idle del mapa).
 */
export const DURATIONS = {
  instant: 0.12,
  base: 0.32,
  lush: 0.55,
  hero: 0.9,
} as const;

/** Tipos de duración disponibles (clave del objeto `DURATIONS`). */
export type DurationKey = keyof typeof DURATIONS;

/**
 * Curvas Bézier nombradas para describir la intención del movimiento:
 *   - `enter`:  ingresos suaves con un pequeño overshoot perceptual.
 *   - `exit`:   salidas decididas que abandonan rápido el viewport.
 *   - `smooth`: tránsitos largos y orgánicos (ideal para el panning).
 */
export const EASINGS = {
  enter: 'cubic-bezier(0.22, 0.84, 0.34, 1)',
  exit: 'cubic-bezier(0.55, 0.03, 0.71, 0.32)',
  smooth: 'cubic-bezier(0.36, 0.66, 0.04, 1)',
} as const;

/** Tipos de easing disponibles. */
export type EasingKey = keyof typeof EASINGS;

/**
 * Stagger en segundos para listas y cuadrículas. `tight` se reserva a
 * tiles pequeños (chips, badges), `normal` a cards/markers y `lush` a
 * heros y reveals corales con muchos elementos en pantalla.
 */
export const STAGGERS = {
  tight: 0.04,
  normal: 0.07,
  lush: 0.12,
} as const;

/** Tipos de stagger disponibles. */
export type StaggerKey = keyof typeof STAGGERS;

/**
 * Radio (px) de captura del cursor magnético sobre CTAs primarios.
 * Mantener fuera del componente facilita ajustar la sensibilidad sin
 * abrir un PR contra cada consumidor.
 */
export const MAGNETIC_RADIUS_PX = 24;

/** Strength de atracción magnética (proporción 0..1). */
export const MAGNETIC_STRENGTH = 0.35;

/**
 * Cadencia (s) del paneo idle del mapa hacia el "hot municipio". El
 * Atelier especifica 30 s; lo reexportamos para que el helper y los
 * tests compartan la misma constante.
 */
export const MAP_IDLE_INTERVAL_S = 30;

/**
 * Cadencia (s) del giro 360° del gradiente conic en cards. 8 s genera
 * una sensación de presencia continua sin distraer la lectura.
 */
export const CARD_CONIC_ROTATION_S = 8;

/**
 * Resuelve una duración respetando `prefers-reduced-motion`. Cuando el
 * usuario solicita movimiento reducido, devolvemos `instant`, que se
 * interpreta como "casi inmediato" pero conserva la transición.
 */
export function resolveAtelierDuration(key: DurationKey): number {
  if (prefersReducedMotion()) return DURATIONS.instant;
  return DURATIONS[key];
}

/**
 * Devuelve `0` cuando se pide movimiento reducido para que `gsap` salte
 * directamente al estado final. Útil en `from`/`to` cuando NO queremos
 * preservar siquiera el `instant` (revealings densos en home).
 */
export function resolveAtelierDurationOrSkip(key: DurationKey): number {
  if (prefersReducedMotion()) return 0;
  return DURATIONS[key];
}

/**
 * Catálogo de presets reutilizables para `gsap.from`/`to`. Empaquetamos
 * los argumentos típicos para reducir duplicación y garantizar que
 * todos los reveals comparten timing y easing.
 */
export const motionPresets = {
  /** Intro coral de markers desde el centro (radial). */
  markerRevealRadial: {
    scale: 0,
    opacity: 0,
    duration: DURATIONS.lush,
    ease: EASINGS.enter,
    stagger: { from: 'center' as const, amount: 0.6 },
    transformOrigin: '50% 50%',
    clearProps: 'transform,opacity',
  },
  /** Intro estándar (fade + lift) para tarjetas y panels. */
  cardEnter: {
    opacity: 0,
    y: 16,
    duration: DURATIONS.base,
    ease: EASINGS.enter,
    clearProps: 'transform,opacity',
  },
  /** Salida rápida hacia abajo (overlays cerrándose). */
  overlayExit: {
    opacity: 0,
    y: 12,
    duration: DURATIONS.base,
    ease: EASINGS.exit,
  },
  /** Microinteracción de hover scale para CTAs de acción. */
  ctaHover: {
    scale: 1.04,
    duration: DURATIONS.instant,
    ease: EASINGS.enter,
    overwrite: 'auto' as const,
  },
} as const;

/**
 * Exporta el resultado de `motionPresets.markerRevealRadial` listo para
 * pasar a `gsap.from('.maplibregl-marker', ...)`. Resolver duración aquí
 * facilita reutilizarlo desde tests y desde la home sin duplicar la
 * comprobación de `prefers-reduced-motion`.
 */
export function buildMarkerRevealVars(): TweenVarsLike {
  return {
    ...motionPresets.markerRevealRadial,
    duration: resolveAtelierDurationOrSkip('lush'),
  };
}

/**
 * Devuelve la duración del giro conic ajustada al modo reducido. Cuando
 * el usuario pide menos movimiento "congelamos" el gradiente.
 */
export function resolveConicDuration(): number {
  return prefersReducedMotion() ? 0 : CARD_CONIC_ROTATION_S;
}
