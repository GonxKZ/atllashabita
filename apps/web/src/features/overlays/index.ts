/**
 * Punto de entrada del módulo de overlays cartográficos del Atelier
 * (M12 · issue #118). Re-exporta los componentes para que `DashboardShell`
 * y los tests consuman desde una ruta estable.
 */

export { FloatingRanking } from './FloatingRanking';
export type { FloatingRankingProps } from './FloatingRanking';
export { TerritorySheet, SHEET_SNAP_POINTS } from './TerritorySheet';
export type { TerritorySheetProps, SheetSnap } from './TerritorySheet';
export { MiniMap } from './MiniMap';
export type { MiniMapProps, MiniMapViewport } from './MiniMap';
export { RichLegend } from './RichLegend';
export type { RichLegendProps } from './RichLegend';
export { MarkerRichTooltip } from './MarkerRichTooltip';
export type {
  MarkerRichTooltipProps,
  MarkerRichTooltipMarker,
  MarkerRichTooltipIndicator,
} from './MarkerRichTooltip';
