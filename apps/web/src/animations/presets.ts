/**
 * Presets compartidos por los componentes motion de AtlasHabita.
 *
 * Centralizamos los valores para mantener una sensación homogénea al
 * animar (easings, staggers y duraciones) y facilitar cualquier ajuste
 * en una única fuente de verdad.
 */

/** Curva de entrada suave, inspirada en el sistema de diseño. */
export const EASE_IN_OUT = 'power2.out';

/** Curva enfática para microinteracciones (hover, pulse). */
export const EASE_MICRO = 'power1.out';

/** Duración base (segundos) para entradas estándar. */
export const DURATION_DEFAULT = 0.6;

/** Duración corta para microinteracciones. */
export const DURATION_MICRO = 0.25;

/** Separación entre hijos animados en cascada. */
export const STAGGER_DEFAULT = 0.08;

/** Valor vertical de entrada (fade+slide hacia arriba). */
export const FADE_IN_OFFSET = 24;
