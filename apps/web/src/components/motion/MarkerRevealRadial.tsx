import { useCallback, useEffect, useRef, type ReactNode, type RefObject } from 'react';
import gsap from 'gsap';

import {
  EASINGS,
  MAP_IDLE_INTERVAL_S,
  buildMarkerRevealVars,
  prefersReducedMotion,
} from '@/animations';

type Document = globalThis.Document;
type HTMLDivElement = globalThis.HTMLDivElement;

/** Selector estándar de markers MapLibre (clase autogenerada por la librería). */
export const MAPLIBRE_MARKER_SELECTOR = '.maplibregl-marker';

/**
 * Coordenadas mínimas exigidas a un punto candidato a "hot municipio".
 * Mantener una interfaz local (en lugar de importar la del mapa) evita
 * acoplar el helper a las features y permite reutilizarlo desde otros
 * contextos (analítica, dashboards externos, tests).
 */
export interface IdleHotPoint {
  readonly id: string;
  readonly lat: number;
  readonly lon: number;
  readonly score: number;
}

export interface PerformMarkerRevealOptions {
  /** Container raíz donde buscar `.maplibregl-marker`. */
  readonly scope: HTMLElement | Document;
  /** Permite sobreescribir vars (delays adicionales, ease custom). */
  readonly overrides?: gsap.TweenVars;
}

/**
 * Lanza el reveal radial de markers en el scope indicado. Es un helper
 * puro pensado para uso en hooks o tests: devuelve el `Tween` para que
 * el consumidor lo pueda detener si fuese necesario, o `null` cuando no
 * encuentra ningún marker (caso degenerado del primer load del mapa).
 */
export function performMarkerReveal({
  scope,
  overrides,
}: PerformMarkerRevealOptions): gsap.core.Tween | null {
  const targets = scope.querySelectorAll(MAPLIBRE_MARKER_SELECTOR);
  if (targets.length === 0) return null;
  const baseVars = buildMarkerRevealVars();
  return gsap.from(targets, { ...baseVars, ...overrides });
}

export interface UseMarkerRevealOptions {
  /** Ref al container que contiene los markers. */
  readonly scopeRef: RefObject<HTMLElement | null>;
  /**
   * Cualquier valor cuya mutación debe disparar un nuevo reveal: por
   * defecto pasamos la longitud de la lista para no relanzar reveals
   * cuando sólo cambia el color de la capa.
   */
  readonly trigger?: unknown;
  /** Permite desactivar el efecto sin desmontar el hook. */
  readonly disabled?: boolean;
}

/**
 * Hook que reaplica el reveal radial cuando cambia el `trigger`. Pensado
 * para envolver al `<SpainMap>` o cualquier wrapper que ya monte sus
 * markers vía `react-map-gl`. Internamente reusa `useGSAP` a través de
 * `gsap.context` con cleanup automático al desmontar.
 */
export function useMarkerReveal({
  scopeRef,
  trigger,
  disabled = false,
}: UseMarkerRevealOptions): void {
  useEffect(() => {
    if (disabled) return undefined;
    const node = scopeRef.current;
    if (!node) return undefined;
    const ctx = gsap.context(() => {
      performMarkerReveal({ scope: node });
    }, node);
    return () => ctx.revert();
    // `trigger` se incluye intencionalmente: queremos relanzar la
    // animación cuando el caller indique que el dataset ha cambiado.
  }, [scopeRef, trigger, disabled]);
}

export interface MarkerRevealRadialProps {
  /** Subárbol que contiene `.maplibregl-marker`. */
  readonly children: ReactNode;
  /**
   * Valor que dispara un nuevo reveal cuando cambia (ej.: `points.length`).
   * Si se omite el reveal sólo se aplica al montar.
   */
  readonly trigger?: unknown;
  /** Desactiva el efecto sin afectar al render del subárbol. */
  readonly disabled?: boolean;
  /** Etiqueta accesible. Por defecto se omite. */
  readonly 'aria-label'?: string;
  readonly className?: string;
}

/**
 * Componente trigger: monta el subárbol y se encarga de aplicar el
 * reveal radial sobre los markers MapLibre presentes en su DOM. Útil
 * cuando no se quiere (o no se puede) tocar el componente del mapa
 * directamente.
 */
export function MarkerRevealRadial({
  children,
  trigger,
  disabled = false,
  'aria-label': ariaLabel,
  className,
}: MarkerRevealRadialProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  useMarkerReveal({ scopeRef: containerRef, trigger, disabled });
  return (
    <div
      ref={containerRef}
      className={className}
      data-motion="marker-reveal-radial"
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
}

export interface IdleMapPanController {
  /** Detiene el bucle pero no desactiva la posibilidad de reanudarlo. */
  readonly stop: () => void;
  /** Limpia por completo el bucle (idempotente). */
  readonly destroy: () => void;
  /**
   * Dispara manualmente un paneo al hot municipio. Acepta un override
   * de duración (en segundos) y de coordenadas, útil para los tests.
   */
  readonly panNow: (override?: { lat?: number; lon?: number; duration?: number }) => void;
}

export interface MapLikeInstance {
  readonly easeTo: (options: {
    center: [number, number];
    duration: number;
    easing?: (t: number) => number;
  }) => unknown;
}

export interface CreateIdleMapPanOptions {
  /** Mapa real (`maplibre-gl` o `react-map-gl`) o su mock. */
  readonly map: MapLikeInstance;
  /** Función que devuelve el hot municipio actual o `null`. */
  readonly getHotPoint: () => IdleHotPoint | null;
  /**
   * Intervalo en milisegundos. Por defecto `MAP_IDLE_INTERVAL_S * 1000`
   * (30 s) para encajar con el spec del Atelier.
   */
  readonly intervalMs?: number;
  /** Duración (s) del `easeTo`. Por defecto 1.6 s. */
  readonly easeDurationS?: number;
  /**
   * Reloj inyectable (sólo para tests). Si se omite usamos
   * `globalThis.setInterval`/`clearInterval`.
   */
  readonly scheduler?: {
    setInterval: typeof globalThis.setInterval;
    clearInterval: typeof globalThis.clearInterval;
  };
}

/**
 * Crea un controlador que pansea el mapa al hot municipio cada cierto
 * intervalo, respetando `prefers-reduced-motion`. Lo construimos como
 * función pura (no hook) para poder reutilizarlo desde efectos en
 * componentes y desde tests vitest sin react-test-renderer.
 */
export function createIdleMapPan({
  map,
  getHotPoint,
  intervalMs = MAP_IDLE_INTERVAL_S * 1000,
  easeDurationS = 1.6,
  scheduler,
}: CreateIdleMapPanOptions): IdleMapPanController {
  // Usamos parametrizable scheduler para que vitest pueda inyectar
  // fakeTimers sin depender de variables globales del entorno.
  const realScheduler = scheduler ?? {
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
  };

  let timer: ReturnType<typeof globalThis.setInterval> | null = null;

  const panNow: IdleMapPanController['panNow'] = (override) => {
    if (prefersReducedMotion()) return;
    const point = getHotPoint();
    if (!point) return;
    const lat = override?.lat ?? point.lat;
    const lon = override?.lon ?? point.lon;
    const durationMs = (override?.duration ?? easeDurationS) * 1000;
    map.easeTo({
      center: [lon, lat],
      duration: durationMs,
      easing: (t) => 1 - Math.pow(1 - t, 3),
    });
  };

  // Arrancamos sólo si no se solicita movimiento reducido. El
  // controlador puede ser invocado manualmente (`panNow`) en
  // cualquier caso.
  if (!prefersReducedMotion()) {
    timer = realScheduler.setInterval(() => panNow(), intervalMs);
  }

  const stop = () => {
    if (timer !== null) {
      realScheduler.clearInterval(timer);
      timer = null;
    }
  };

  return {
    stop,
    destroy: stop,
    panNow,
  };
}

export interface UseIdleMapPanOptions {
  /** Devuelve la instancia activa del mapa o `null` si aún no existe. */
  readonly getMap: () => MapLikeInstance | null;
  /** Hot municipio actual o `null`. */
  readonly getHotPoint: () => IdleHotPoint | null;
  /** Habilitación dinámica: pásalo `false` para pausar sin desmontar. */
  readonly enabled?: boolean;
  readonly intervalMs?: number;
}

/**
 * Hook ergonómico para enganchar el panning idle desde un componente.
 * Devuelve un `panNow` estable para que la UI pueda forzarlo (por
 * ejemplo al pulsar un botón "Volver al hot municipio").
 */
export function useIdleMapPan({
  getMap,
  getHotPoint,
  enabled = true,
  intervalMs,
}: UseIdleMapPanOptions): { panNow: () => void } {
  const controllerRef = useRef<IdleMapPanController | null>(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const map = getMap();
    if (!map) return undefined;
    const controller = createIdleMapPan({
      map,
      getHotPoint,
      ...(intervalMs !== undefined ? { intervalMs } : {}),
    });
    controllerRef.current = controller;
    return () => {
      controller.destroy();
      controllerRef.current = null;
    };
  }, [enabled, getMap, getHotPoint, intervalMs]);

  const panNow = useCallback(() => {
    controllerRef.current?.panNow();
  }, []);

  return { panNow };
}

/**
 * Tweena el color de los markers visibles sin remontar el subárbol del
 * mapa. Espera nodos con `data-bubble-color` actualizado: cuando cambia
 * el atributo, GSAP interpola hacia el nuevo color usando el easing
 * `enter` del Atelier.
 */
export function tweenMarkerColors(scope: HTMLElement | Document): gsap.core.Tween | null {
  const targets = scope.querySelectorAll<HTMLElement>('[data-bubble-color]');
  if (targets.length === 0) return null;
  const duration = prefersReducedMotion() ? 0 : 0.4;
  return gsap.to(Array.from(targets), {
    backgroundColor: (_index: number, target: HTMLElement) =>
      target.dataset.bubbleColor ?? '#10b981',
    duration,
    ease: EASINGS.smooth,
    overwrite: 'auto',
  });
}
