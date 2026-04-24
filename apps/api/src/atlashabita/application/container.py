"""Punto de montaje del contenedor de dependencias.

Mientras Teammate C materializa la capa de aplicación definitiva, este módulo
re-exporta el contenedor del shim ``_stub``. En cuanto se mergee la capa real,
basta con reemplazar el import; la capa HTTP no se ve afectada.
"""

from __future__ import annotations

from atlashabita.application._stub import (
    ComputeRankingsUseCase,
    Container,
    GeoFeature,
    GeoLayerPayload,
    GetMapLayerUseCase,
    GetQualityReportUseCase,
    GetTerritoryDetailUseCase,
    ListMapLayersUseCase,
    ListProfilesUseCase,
    ListSourcesUseCase,
    MapLayer,
    QualityReport,
    QualityRow,
    RankingEntry,
    RankingResult,
    ScoringService,
    SearchTerritoriesUseCase,
    TerritoryDetail,
)

__all__ = [
    "ComputeRankingsUseCase",
    "Container",
    "GeoFeature",
    "GeoLayerPayload",
    "GetMapLayerUseCase",
    "GetQualityReportUseCase",
    "GetTerritoryDetailUseCase",
    "ListMapLayersUseCase",
    "ListProfilesUseCase",
    "ListSourcesUseCase",
    "MapLayer",
    "QualityReport",
    "QualityRow",
    "RankingEntry",
    "RankingResult",
    "ScoringService",
    "SearchTerritoriesUseCase",
    "TerritoryDetail",
]
