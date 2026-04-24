"""Casos de uso de la capa de aplicación.

Cada caso de uso encapsula una intención del usuario y orquesta el dominio,
el lector de seed y el servicio de scoring. Son deliberadamente finos:
validación de parámetros, traducción a objetos de dominio y formateo
JSON-serializable. No conocen FastAPI ni rdflib.
"""

from atlashabita.application.use_cases.compute_rankings import ComputeRankingsUseCase
from atlashabita.application.use_cases.get_map_layer import GetMapLayerUseCase
from atlashabita.application.use_cases.get_quality_report import GetQualityReportUseCase
from atlashabita.application.use_cases.get_territory_detail import GetTerritoryDetailUseCase
from atlashabita.application.use_cases.list_map_layers import ListMapLayersUseCase
from atlashabita.application.use_cases.list_profiles import ListProfilesUseCase
from atlashabita.application.use_cases.list_sources import ListSourcesUseCase
from atlashabita.application.use_cases.search_territories import SearchTerritoriesUseCase

__all__ = [
    "ComputeRankingsUseCase",
    "GetMapLayerUseCase",
    "GetQualityReportUseCase",
    "GetTerritoryDetailUseCase",
    "ListMapLayersUseCase",
    "ListProfilesUseCase",
    "ListSourcesUseCase",
    "SearchTerritoriesUseCase",
]
