/**
 * Catálogo declarativo de capas multi-métrica del mapa territorial.
 *
 * Cada entrada describe los metadatos visuales (paleta, etiqueta, unidad,
 * descripción) y la lógica para extraer su valor desde un `EnrichedMapPoint`.
 * Este desacoplamiento permite que `SpainMap`, la leyenda y el switcher
 * compartan exactamente la misma fuente de verdad: una sola declaración
 * impacta a todas las superficies de UI sin duplicar lógica.
 *
 * Reglas de diseño:
 *  - El catálogo es estático (no depende de los datos): la paleta y la
 *    descripción son inmutables.
 *  - El dominio (`domain`) se calcula a partir de los puntos en runtime con
 *    `computeLayerDomain` para que el rampado refleje el rango real visible.
 *  - El campo `inverse` indica si valores bajos representan "mejor": para
 *    accidentes/precio de alquiler, queremos que la rampa más oscura/cálida
 *    señale los valores altos (peor) y la suave los valores bajos (mejor).
 */

import type { IndicatorId, NationalMunicipality } from '../../../data/national_mock';
import type { MapPoint } from '../../../data/mock';

/** Identificador de capa: `score` o cualquier indicador del catálogo nacional. */
export type MapLayerId = 'score' | IndicatorId;

/**
 * Punto del mapa enriquecido con todos los indicadores del municipio.
 *
 * Conserva los campos originales de `MapPoint` para no romper la firma de
 * `SpainMap`, y añade las series completas de `national_mock` para que el
 * tooltip multi-indicador pueda listarlas todas a la vez.
 */
export interface EnrichedMapPoint extends MapPoint {
  readonly indicators: NationalMunicipality['indicators'];
  readonly population: number;
  readonly province: string;
  readonly autonomousCommunity: string;
}

/** Dominio (mín/máx) detectado para una capa concreta. */
export interface LayerDomain {
  readonly min: number;
  readonly max: number;
}

export interface MapLayerDefinition {
  readonly id: MapLayerId;
  readonly label: string;
  readonly description: string;
  /** Sufijo de unidad usado en leyenda y tooltip. */
  readonly unit: string;
  /** Paleta cromática de cinco tramos (oscuro → claro). */
  readonly palette: readonly [string, string, string, string, string];
  /** Si `true`, valores bajos se interpretan como "mejor". */
  readonly inverse?: boolean;
  /** Selector que extrae el valor numérico desde un punto enriquecido. */
  readonly selector: (point: EnrichedMapPoint) => number;
}

/**
 * Helper privado para resolver el indicador `id` y devolver `0` si no existe
 * (los datasets reales pueden quedar parcialmente cubiertos).
 */
function pickIndicator(point: EnrichedMapPoint, id: IndicatorId): number {
  const indicator = point.indicators.find((entry) => entry.id === id);
  return indicator?.value ?? 0;
}

export const MAP_LAYER_CATALOG: readonly MapLayerDefinition[] = [
  {
    id: 'score',
    label: 'Score territorial',
    description: 'Encaje agregado del municipio con el perfil activo.',
    unit: '',
    palette: ['#065f46', '#047857', '#059669', '#10b981', '#34d399'],
    selector: (point) => point.score,
  },
  {
    id: 'rent_price',
    label: 'Alquiler medio',
    description: 'Precio mensual del alquiler residencial (INE Vivienda).',
    unit: ' €/m²',
    palette: ['#7f1d1d', '#b91c1c', '#dc2626', '#f87171', '#fee2e2'],
    inverse: true,
    selector: (point) => pickIndicator(point, 'rent_price'),
  },
  {
    id: 'broadband',
    label: 'Banda ancha',
    description: 'Cobertura FTTH y cable >100 Mbps (MITECO).',
    unit: ' %',
    palette: ['#0c4a6e', '#075985', '#0369a1', '#38bdf8', '#bae6fd'],
    selector: (point) => pickIndicator(point, 'broadband'),
  },
  {
    id: 'income',
    label: 'Renta hogar',
    description: 'Renta disponible bruta media por hogar (INE).',
    unit: ' €',
    palette: ['#312e81', '#4338ca', '#6366f1', '#a5b4fc', '#e0e7ff'],
    selector: (point) => pickIndicator(point, 'income'),
  },
  {
    id: 'services',
    label: 'Servicios sanitarios',
    description: 'Centros sanitarios por 10.000 habitantes (Ministerio de Sanidad).',
    unit: ' ratio',
    palette: ['#7c2d12', '#9a3412', '#ea580c', '#fb923c', '#fed7aa'],
    selector: (point) => pickIndicator(point, 'services'),
  },
  {
    id: 'climate',
    label: 'Clima',
    description: 'Temperatura media anual (AEMET).',
    unit: ' °C',
    palette: ['#1e3a8a', '#1d4ed8', '#3b82f6', '#93c5fd', '#dbeafe'],
    selector: (point) => pickIndicator(point, 'climate'),
  },
  {
    id: 'mobility',
    label: 'Movilidad',
    description: 'Duración media del trayecto al trabajo (MITMA Big Data).',
    unit: ' min',
    palette: ['#581c87', '#7e22ce', '#a855f7', '#c084fc', '#e9d5ff'],
    inverse: true,
    selector: (point) => pickIndicator(point, 'mobility'),
  },
  {
    id: 'accidents',
    label: 'Accidentes',
    description: 'Víctimas anuales en accidentes de tráfico (DGT).',
    unit: ' víctimas/año',
    palette: ['#450a0a', '#7f1d1d', '#b91c1c', '#f87171', '#fecaca'],
    inverse: true,
    selector: (point) => pickIndicator(point, 'accidents'),
  },
  {
    id: 'transit',
    label: 'Transporte público',
    description: 'Cobertura de transporte público regular (CRTM y consorcios).',
    unit: ' %',
    palette: ['#134e4a', '#0f766e', '#14b8a6', '#5eead4', '#ccfbf1'],
    selector: (point) => pickIndicator(point, 'transit'),
  },
];

/** Mapa indexado por id para resoluciones O(1) en componentes consumidores. */
export const MAP_LAYER_BY_ID: Readonly<Record<MapLayerId, MapLayerDefinition>> = Object.freeze(
  Object.fromEntries(MAP_LAYER_CATALOG.map((layer) => [layer.id, layer])) as Record<
    MapLayerId,
    MapLayerDefinition
  >
);

/** Devuelve la capa por id, con fallback al `score` cuando el id es desconocido. */
export function resolveLayer(id: string | undefined): MapLayerDefinition {
  if (id && id in MAP_LAYER_BY_ID) {
    return MAP_LAYER_BY_ID[id as MapLayerId];
  }
  return MAP_LAYER_BY_ID.score;
}

/**
 * Calcula el dominio observado para una capa contra una colección de puntos.
 *
 * Cuando todos los valores son iguales, ensanchamos artificialmente el rango
 * (`±1`) para evitar divisiones por cero en consumidores que normalizan.
 */
export function computeLayerDomain(
  points: readonly EnrichedMapPoint[],
  layer: MapLayerDefinition
): LayerDomain {
  if (points.length === 0) {
    return { min: 0, max: 1 };
  }
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const point of points) {
    const value = layer.selector(point);
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }
  if (min === max) {
    return { min: min - 1, max: max + 1 };
  }
  return { min, max };
}

/**
 * Devuelve el color de la rampa correspondiente al `value` dentro del
 * `domain`. Convención: el primer color de la paleta (`palette[0]`) siempre
 * representa el valor más alto observado. La interpretación cualitativa
 * "alto = bueno" o "alto = malo" es propia de cada capa (`inverse`),
 * y se refleja sólo en la elección del color base (verde para `score`,
 * rojo para `rent_price` y `accidents`).
 */
export function valueToColor(
  value: number,
  layer: MapLayerDefinition,
  domain: LayerDomain
): string {
  const { palette } = layer;
  const span = domain.max - domain.min;
  if (span <= 0) return palette[0];
  const normalized = (value - domain.min) / span;
  const clamped = Math.min(Math.max(normalized, 0), 1);
  const bucketCount = palette.length;
  // Valor máximo → palette[0]; valor mínimo → palette[bucketCount - 1].
  const indexFromLow = Math.min(bucketCount - 1, Math.floor(clamped * bucketCount));
  const finalIndex = bucketCount - 1 - indexFromLow;
  return palette[finalIndex];
}

/**
 * Calcula el radio (en píxeles) para una burbuja en función del valor.
 *
 * El cálculo prioriza coherencia: un valor cercano al máximo siempre genera
 * la burbuja más grande, sin importar que la métrica sea inversa (la rampa
 * cromática ya transmite la cualidad bueno/malo).
 */
export function valueToRadius(
  value: number,
  domain: LayerDomain,
  bounds: { readonly min: number; readonly max: number } = { min: 12, max: 28 }
): number {
  const span = domain.max - domain.min;
  if (span <= 0) return Math.round((bounds.min + bounds.max) / 2);
  const normalized = Math.min(Math.max((value - domain.min) / span, 0), 1);
  return Math.round(bounds.min + normalized * (bounds.max - bounds.min));
}

/**
 * Construye `MapLegendStop[]` a partir del dominio observado y la paleta de la
 * capa. Los tramos se reparten linealmente entre `min` y `max`. La leyenda
 * lee este resultado para mostrar la rampa con sus umbrales reales.
 */
export interface LayerLegendStop {
  readonly min: number;
  readonly max: number;
  readonly color: string;
}

export function buildLegendStops(
  layer: MapLayerDefinition,
  domain: LayerDomain
): readonly LayerLegendStop[] {
  const { palette } = layer;
  const span = domain.max - domain.min;
  const bucketCount = palette.length;
  const step = span / bucketCount;
  const stops: LayerLegendStop[] = [];
  // Recorre de menor a mayor; cada bucket recibe el color que `valueToColor`
  // asignaría a un valor dentro de ese rango. Esto garantiza que la leyenda
  // refleje exactamente el mapeo cromático del mapa.
  for (let i = 0; i < bucketCount; i += 1) {
    const min = domain.min + step * i;
    const max = i === bucketCount - 1 ? domain.max : domain.min + step * (i + 1);
    const colorIndex = bucketCount - 1 - i;
    stops.push({ min, max, color: palette[colorIndex] });
  }
  return stops;
}
