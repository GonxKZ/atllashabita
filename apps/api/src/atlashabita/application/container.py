"""Composition root de la capa de aplicación.

El contenedor agrupa las dependencias compartidas (dataset, scoring) y
construye los casos de uso bajo demanda mediante ``cached_property``. Es el
único punto donde se cablean objetos; los consumidores (routers FastAPI,
tests) piden casos de uso al contenedor en lugar de instanciar servicios.
"""

from __future__ import annotations

import hashlib
from functools import cached_property
from typing import Final

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
from atlashabita.config import Settings
from atlashabita.domain.territories import Territory
from atlashabita.infrastructure.ingestion import SeedDataset, SeedLoader

_DATA_VERSION_PREFIX: Final[str] = "seed:"


class Container:
    """Contenedor de dependencias inyectable.

    La instancia puede compartirse entre peticiones: los casos de uso son
    puros sobre el dataset cacheado en memoria. Para invalidar el dataset
    basta con instanciar un nuevo contenedor.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    @property
    def settings(self) -> Settings:
        """Configuración inyectada al crear el contenedor."""
        return self._settings

    @cached_property
    def dataset(self) -> SeedDataset:
        """Dataset seed cargado de forma perezosa la primera vez que se pide."""
        loader = SeedLoader(self._settings.data_zone("seed"))
        return loader.load()

    @cached_property
    def scoring_service(self) -> ScoringService:
        """Servicio de scoring explicable vinculado al dataset actual."""
        return ScoringService(self.dataset, self._settings)

    @cached_property
    def territory_index(self) -> dict[str, Territory]:
        """Índice ``identifier -> Territory`` para búsquedas O(1)."""
        return {territory.identifier: territory for territory in self.dataset.territories}

    @cached_property
    def data_version(self) -> str:
        """Identificador estable del dataset en memoria."""
        digest = hashlib.sha256()
        for territory in self.dataset.territories:
            digest.update(territory.identifier.encode("utf-8"))
        for observation in self.dataset.observations:
            digest.update(
                f"{observation.indicator_code}:{observation.territory_id}:"
                f"{observation.period}:{observation.value}".encode()
            )
        return f"{_DATA_VERSION_PREFIX}{digest.hexdigest()[:12]}"

    @cached_property
    def search_territories(self) -> SearchTerritoriesUseCase:
        """Caso de uso de búsqueda textual de territorios."""
        return SearchTerritoriesUseCase(dataset=self.dataset)

    @cached_property
    def get_territory_detail(self) -> GetTerritoryDetailUseCase:
        """Ficha territorial con scores por perfil."""
        return GetTerritoryDetailUseCase(
            dataset=self.dataset,
            scoring_service=self.scoring_service,
        )

    @cached_property
    def compute_rankings(self) -> ComputeRankingsUseCase:
        """Ranking parametrizado por perfil, ámbito y pesos."""
        return ComputeRankingsUseCase(
            dataset=self.dataset,
            scoring_service=self.scoring_service,
            settings=self._settings,
            data_version=self.data_version,
        )

    @cached_property
    def list_profiles(self) -> ListProfilesUseCase:
        """Listado de perfiles de decisión."""
        return ListProfilesUseCase(dataset=self.dataset)

    @cached_property
    def list_sources(self) -> ListSourcesUseCase:
        """Listado de fuentes de datos."""
        return ListSourcesUseCase(dataset=self.dataset)

    @cached_property
    def list_map_layers(self) -> ListMapLayersUseCase:
        """Catálogo de capas cartográficas."""
        return ListMapLayersUseCase(dataset=self.dataset)

    @cached_property
    def get_map_layer(self) -> GetMapLayerUseCase:
        """Generación de GeoJSON para una capa concreta."""
        return GetMapLayerUseCase(
            dataset=self.dataset,
            scoring_service=self.scoring_service,
        )

    @cached_property
    def get_quality_report(self) -> GetQualityReportUseCase:
        """Informe de calidad resumido del dataset."""
        return GetQualityReportUseCase(
            dataset=self.dataset,
            data_version=self.data_version,
        )
