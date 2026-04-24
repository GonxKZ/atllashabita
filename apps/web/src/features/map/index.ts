export { SpainMap, scoreToColor } from './SpainMap';
export type { SpainMapProps, SpainMapPoint } from './SpainMap';
export { MapLegend } from './MapLegend';
export type { MapLegendProps, MapLegendStop, MapLegendDomain } from './MapLegend';
export { MapTooltip } from './MapTooltip';
export type { MapTooltipProps, MapTooltipIndicator } from './MapTooltip';
export {
  LayerSwitcher,
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
  type LayerSwitcherProps,
} from './layers';
