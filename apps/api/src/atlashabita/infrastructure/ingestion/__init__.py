"""Ingesta de datos: lectores del dataset demo y futuros descargadores.

El servicio expone una única entrada ``SeedLoader`` para la MVP. Cuando se
incorporen descargadores reales (issue #8 parte 2) vivirán aquí y compartirán
los contratos definidos en :mod:`atlashabita.domain`.
"""

from atlashabita.infrastructure.ingestion.seed_loader import (
    SeedDataset,
    SeedLoader,
    seed_loader_from_settings,
)

__all__ = ["SeedDataset", "SeedLoader", "seed_loader_from_settings"]
