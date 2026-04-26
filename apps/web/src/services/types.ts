/**
 * Contratos de datos expuestos por la API de AtlasHabita.
 *
 * Los tipos se escriben manualmente a partir del documento
 * `docs/15_BACKEND_API_CONTRATOS_Y_SERVICIOS.md`. No se generan desde OpenAPI
 * para mantener control explícito del contrato en el frontend.
 */

// -------------------------------------------------------------------------
// Perfiles y ámbitos
// -------------------------------------------------------------------------

/**
 * Identificadores canónicos de perfil de decisión soportados por la API.
 * Cualquier nuevo perfil debe añadirse aquí y en la fuente `profiles.ts`.
 */
export type ProfileId = 'student' | 'family' | 'remote_work' | 'retire';

export interface ProfileWeight {
  readonly factor: string;
  readonly weight: number;
  readonly label?: string;
}

export interface Profile {
  readonly id: ProfileId;
  readonly label: string;
  readonly description: string;
  readonly weights: Readonly<Record<string, number>>;
}

/**
 * Ámbito territorial: país, comunidad autónoma, provincia o municipio.
 *
 * Se codifica como `es` o `kind:code` (por ejemplo `province:41`) para alinearse con
 * el parámetro `scope` aceptado por el endpoint `/rankings`.
 */
export type TerritoryScope =
  | 'es'
  | `autonomous_community:${string}`
  | `province:${string}`;

// -------------------------------------------------------------------------
// Territorios e indicadores
// -------------------------------------------------------------------------

export type TerritoryKind = 'country' | 'autonomous_community' | 'province' | 'municipality';

export interface TerritorySearchResult {
  readonly id: string;
  readonly name: string;
  readonly type: TerritoryKind;
  readonly province?: string;
  readonly autonomous_community?: string;
}

export interface TerritoryHierarchy {
  readonly province?: string;
  readonly autonomous_community?: string;
}

export type IndicatorQuality = 'ok' | 'imputed' | 'missing' | 'warning';

export interface TerritoryIndicator {
  readonly id: string;
  readonly label: string;
  readonly value: number | null;
  readonly unit: string;
  readonly period: string;
  readonly source_id: string;
  readonly quality: IndicatorQuality;
}

export interface TerritoryScore {
  readonly profile: ProfileId;
  readonly score: number;
  readonly version: string;
}

export interface TerritoryDetail {
  readonly id: string;
  readonly name: string;
  readonly type: TerritoryKind;
  readonly hierarchy: TerritoryHierarchy;
  readonly indicators: readonly TerritoryIndicator[];
  readonly scores: readonly TerritoryScore[];
}

// -------------------------------------------------------------------------
// Rankings
// -------------------------------------------------------------------------

export interface RankingContribution {
  readonly factor: string;
  readonly impact: number;
}

export interface RankingEntry {
  readonly rank: number;
  readonly territory_id: string;
  readonly name: string;
  readonly province?: string;
  readonly score: number;
  readonly confidence: number;
  readonly highlights: readonly string[];
  readonly warnings: readonly string[];
  readonly top_contributions: readonly RankingContribution[];
}

export interface RankingResponse {
  readonly profile: ProfileId;
  readonly scope: TerritoryScope;
  readonly scoring_version: string;
  readonly data_version: string;
  readonly results: readonly RankingEntry[];
}

export interface HardFilter {
  readonly factor: string;
  readonly operator: 'lte' | 'gte' | 'eq';
  readonly value: number;
}

export interface RankingQueryParams {
  readonly profile: ProfileId;
  readonly scope: TerritoryScope;
  readonly limit?: number;
}

export interface RankingCustomBody {
  readonly profile: ProfileId;
  readonly scope: TerritoryScope;
  readonly weights: readonly ProfileWeight[];
  readonly hard_filters?: readonly HardFilter[];
  readonly limit?: number;
}

// -------------------------------------------------------------------------
// Capas de mapa
// -------------------------------------------------------------------------

export type MapLayerKind =
  | 'score'
  | 'rent'
  | 'income'
  | 'services'
  | 'mobility'
  | 'connectivity'
  | 'environment';

export interface MapLayerSummary {
  readonly id: string;
  readonly name: string;
  readonly kind: MapLayerKind;
  readonly description: string;
}

/**
 * Subconjunto tipado de GeoJSON FeatureCollection.
 *
 * Se define aquí para no depender de `@types/geojson` y mantener el contrato
 * local a la API.
 */
export interface GeoJsonFeatureCollection<P = Record<string, unknown>> {
  readonly type: 'FeatureCollection';
  readonly features: ReadonlyArray<{
    readonly type: 'Feature';
    readonly id?: string | number;
    readonly geometry: {
      readonly type: string;
      readonly coordinates: unknown;
    };
    readonly properties: P;
  }>;
}

export interface MapLayerPayload extends MapLayerSummary {
  readonly profile?: ProfileId;
  readonly data: GeoJsonFeatureCollection<{
    readonly territory_id: string;
    readonly name: string;
    readonly value: number | null;
    readonly score?: number;
  }>;
}

// -------------------------------------------------------------------------
// Fuentes y calidad
// -------------------------------------------------------------------------

export type SourceStatus = 'fresh' | 'stale' | 'unavailable';

export interface SourceSummary {
  readonly id: string;
  readonly name: string;
  readonly license: string;
  readonly status: SourceStatus;
  readonly last_ingested_at: string;
  readonly coverage?: string;
}

export interface SourceDetail extends SourceSummary {
  readonly description: string;
  readonly url?: string;
  readonly period?: string;
  readonly indicators: readonly string[];
}

export interface QualityRuleReport {
  readonly rule_id: string;
  readonly description: string;
  readonly passed: number;
  readonly failed: number;
  readonly status: 'passed' | 'failed' | 'warning';
}

export interface QualityReport {
  readonly generated_at: string;
  readonly data_version: string;
  readonly rules: readonly QualityRuleReport[];
}

// -------------------------------------------------------------------------
// Errores normalizados
// -------------------------------------------------------------------------

/**
 * Códigos declarados en la sección 6 del contrato (docs/15).
 * Se amplía con un caso `UNKNOWN` para errores de transporte o inesperados.
 */
export type ApiErrorCode =
  | 'INVALID_PROFILE'
  | 'INVALID_SCOPE'
  | 'TERRITORY_NOT_FOUND'
  | 'INSUFFICIENT_DATA'
  | 'SOURCE_UNAVAILABLE'
  | 'QUALITY_BLOCKED'
  | 'UNKNOWN';

export interface ErrorResponse {
  readonly code: ApiErrorCode | string;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}
