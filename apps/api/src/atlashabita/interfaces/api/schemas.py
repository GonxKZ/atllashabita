"""Esquemas Pydantic v2 expuestos por la API HTTP.

Los esquemas son proyecciones de los objetos del dominio. Conservamos el
modelo del dominio como ``frozen dataclass`` y renderizamos los ``BaseModel``
sólo en la frontera HTTP para no propagar dependencias de FastAPI hacia el
núcleo. ``populate_by_name=True`` permite aceptar campos tanto por alias como
por nombre canónico, lo cual simplifica los tests.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class _ApiModel(BaseModel):
    """Base común con configuración compartida para todos los esquemas."""

    model_config = ConfigDict(
        populate_by_name=True,
        extra="ignore",
        str_strip_whitespace=True,
        frozen=True,
    )


# ---------------------------------------------------------------------------
# Territorios e indicadores
# ---------------------------------------------------------------------------


class TerritoryRead(_ApiModel):
    """Representación pública de un territorio."""

    id: str = Field(..., description="Identificador canónico ``tipo:codigo``.")
    code: str
    name: str
    kind: Literal["autonomous_community", "province", "municipality"]
    parent_code: str | None = None
    province_code: str | None = None
    autonomous_community_code: str | None = None
    population: int | None = None
    area_km2: float | None = None
    lat: float | None = None
    lon: float | None = None


class IndicatorRead(_ApiModel):
    """Metadatos de un indicador."""

    code: str
    label: str
    unit: str
    direction: Literal["higher_is_better", "lower_is_better"]
    description: str
    source_id: str
    min_value: float | None = None
    max_value: float | None = None


class IndicatorObservationRead(_ApiModel):
    """Observación de un indicador en un territorio y periodo concretos."""

    indicator_code: str
    label: str
    unit: str
    value: float
    period: str
    source_id: str
    quality: str


class SourceRead(_ApiModel):
    """Metadatos de una fuente."""

    id: str
    title: str
    publisher: str
    url: str
    license: str
    periodicity: str
    description: str
    coverage: str
    indicators: tuple[str, ...]
    quality: str


class ProfileRead(_ApiModel):
    """Perfil de decisión con pesos normalizados."""

    id: str
    label: str
    description: str
    weights: dict[str, float]


# ---------------------------------------------------------------------------
# Scoring y rankings
# ---------------------------------------------------------------------------


class ScoreContributionRead(_ApiModel):
    """Contribución de un indicador al score final."""

    indicator_code: str
    label: str
    weight: float
    normalized_value: float
    raw_value: float
    unit: str
    impact: float
    direction: str


class TerritoryScoreRead(_ApiModel):
    """Resultado completo de un scoring territorial."""

    territory_id: str
    territory_name: str
    profile_id: str
    score: float
    confidence: float
    version: str
    highlights: tuple[str, ...]
    warnings: tuple[str, ...]
    contributions: tuple[ScoreContributionRead, ...]


class RankingEntryRead(_ApiModel):
    """Una fila del ranking."""

    rank: int
    territory_id: str
    name: str
    province: str | None
    autonomous_community: str | None
    score: float
    confidence: float
    highlights: tuple[str, ...]
    warnings: tuple[str, ...]
    top_contributions: tuple[ScoreContributionRead, ...]


class RankingRequest(_ApiModel):
    """Cuerpo del endpoint ``POST /rankings/custom``."""

    profile: str
    scope: str | None = None
    limit: int = Field(default=20, ge=1)
    weights: dict[str, float] = Field(default_factory=dict)


class RankingResponse(_ApiModel):
    """Respuesta del ranking."""

    profile: str
    scope: str
    scoring_version: str
    data_version: str
    results: tuple[RankingEntryRead, ...]


# ---------------------------------------------------------------------------
# Ficha territorial
# ---------------------------------------------------------------------------


class TerritoryHierarchyRead(_ApiModel):
    """Jerarquía administrativa resumida de un territorio."""

    province: str | None
    autonomous_community: str | None


class TerritoryDetailResponse(_ApiModel):
    """Detalle completo de un territorio."""

    id: str
    name: str
    type: Literal["autonomous_community", "province", "municipality"]
    hierarchy: TerritoryHierarchyRead
    population: int | None
    area_km2: float | None
    lat: float | None
    lon: float | None
    indicators: tuple[IndicatorObservationRead, ...]
    scores: tuple[TerritoryScoreRead, ...]


# ---------------------------------------------------------------------------
# Mapa
# ---------------------------------------------------------------------------


class LayerDescriptor(_ApiModel):
    """Descripción de una capa disponible en el mapa."""

    id: str
    title: str
    description: str
    kind: str
    indicator_code: str | None = None
    unit: str | None = None


class GeoJSONGeometry(_ApiModel):
    """Geometría GeoJSON mínima (puntos para la demo)."""

    type: Literal["Point"]
    coordinates: tuple[float, float]


class GeoJSONFeature(_ApiModel):
    """Feature GeoJSON de un territorio."""

    type: Literal["Feature"] = "Feature"
    id: str
    geometry: GeoJSONGeometry
    properties: dict[str, Any]


class GeoJSONFeatureCollection(_ApiModel):
    """FeatureCollection GeoJSON acompañado del descriptor de capa."""

    type: Literal["FeatureCollection"] = "FeatureCollection"
    layer: LayerDescriptor
    features: tuple[GeoJSONFeature, ...]


# ---------------------------------------------------------------------------
# Calidad
# ---------------------------------------------------------------------------


class QualityRowRead(_ApiModel):
    """Resumen de calidad de un dataset."""

    dataset: str
    total_rows: int
    quality_ok: int
    quality_warn: int
    quality_error: int


class QualityReportResponse(_ApiModel):
    """Reporte de calidad agregado."""

    generated_at: str
    rows: tuple[QualityRowRead, ...]


# ---------------------------------------------------------------------------
# Errores y salud
# ---------------------------------------------------------------------------


class ErrorResponse(_ApiModel):
    """Contrato público de error."""

    error: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)


class HealthResponse(_ApiModel):
    """Eco del endpoint de salud (duplicado aquí para centralizar schemas)."""

    status: str
    name: str
    version: str
    environment: str
    timestamp: str


# ---------------------------------------------------------------------------
# SPARQL y exportación RDF
# ---------------------------------------------------------------------------


SparqlQueryId = Literal[
    "top_scores_by_profile",
    "municipalities_by_province",
    "indicators_for_territory",
    "sources_used_by_territory",
    "count_triples_by_class",
    "indicator_definition",
]

RdfExportFormat = Literal["turtle", "json-ld", "nt", "trig"]


class SparqlQueryRequest(_ApiModel):
    """Cuerpo del endpoint ``POST /sparql``.

    ``bindings`` es un diccionario libre porque cada ``query_id`` acepta un
    subconjunto distinto. La validación específica vive en el caso de uso,
    no aquí, para mantener los schemas como proyección del contrato público.
    """

    query_id: SparqlQueryId
    bindings: dict[str, Any] = Field(default_factory=dict)


class SparqlQueryResponse(_ApiModel):
    """Respuesta del endpoint ``POST /sparql``."""

    query_id: str
    rows: tuple[dict[str, Any], ...]
    elapsed_ms: int


class SparqlCatalogEntry(_ApiModel):
    """Firma pública de una consulta del catálogo."""

    query_id: str
    description: str
    required: tuple[str, ...]
    optional: tuple[str, ...] = ()


class SparqlCatalogResponse(_ApiModel):
    """Respuesta del endpoint ``GET /sparql/catalog``."""

    queries: tuple[SparqlCatalogEntry, ...]


__all__ = [
    "ErrorResponse",
    "GeoJSONFeature",
    "GeoJSONFeatureCollection",
    "GeoJSONGeometry",
    "HealthResponse",
    "IndicatorObservationRead",
    "IndicatorRead",
    "LayerDescriptor",
    "ProfileRead",
    "QualityReportResponse",
    "QualityRowRead",
    "RankingEntryRead",
    "RankingRequest",
    "RankingResponse",
    "RdfExportFormat",
    "ScoreContributionRead",
    "SourceRead",
    "SparqlCatalogEntry",
    "SparqlCatalogResponse",
    "SparqlQueryId",
    "SparqlQueryRequest",
    "SparqlQueryResponse",
    "TerritoryDetailResponse",
    "TerritoryHierarchyRead",
    "TerritoryRead",
    "TerritoryScoreRead",
]
