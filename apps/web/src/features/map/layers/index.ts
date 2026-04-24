/**
 * Punto de entrada del módulo de capas del mapa.
 *
 * Expone tanto el catálogo declarativo (`catalog.ts`) como el componente
 * `LayerSwitcher`. Los componentes consumidores deben importar desde aquí
 * para garantizar que los identificadores y metadatos no se duplican.
 */

export { LayerSwitcher } from './LayerSwitcher';
export type { LayerSwitcherProps } from './LayerSwitcher';
export {
  MAP_LAYER_CATALOG,
  MAP_LAYER_BY_ID,
  resolveLayer,
  computeLayerDomain,
  valueToColor,
  valueToRadius,
  buildLegendStops,
  type MapLayerDefinition,
  type MapLayerId,
  type LayerDomain,
  type LayerLegendStop,
  type EnrichedMapPoint,
} from './catalog';
