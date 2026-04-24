"""Capa de aplicación: casos de uso orquestando el dominio y la infraestructura.

Expone el :class:`Container` (composition root), el :class:`ScoringService`
explicable y los casos de uso que utilizan los routers HTTP. Los módulos de
interfaz solo deberían depender de estos símbolos, nunca de la infraestructura
directamente.
"""

from atlashabita.application.container import Container
from atlashabita.application.scoring import ScoringService
from atlashabita.application.use_cases import (
    ComputeRankingsUseCase,
    GetMapLayerUseCase,
    GetQualityReportUseCase,
    GetTerritoryDetailUseCase,
    ListMapLayersUseCase,
    ListProfilesUseCase,
    ListSourcesUseCase,
    SearchTerritoriesUseCase,
)

__all__ = [
    "ComputeRankingsUseCase",
    "Container",
    "GetMapLayerUseCase",
    "GetQualityReportUseCase",
    "GetTerritoryDetailUseCase",
    "ListMapLayersUseCase",
    "ListProfilesUseCase",
    "ListSourcesUseCase",
    "ScoringService",
    "SearchTerritoriesUseCase",
]
