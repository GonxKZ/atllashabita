"""Exposición de las fuentes de datos oficiales (RF-013, RF-032)."""

from __future__ import annotations

from dataclasses import dataclass

from atlashabita.domain.sources import DataSource
from atlashabita.infrastructure.ingestion import SeedDataset


@dataclass(frozen=True, slots=True)
class ListSourcesUseCase:
    """Devuelve las fuentes registradas."""

    dataset: SeedDataset

    def execute(self) -> list[DataSource]:
        """Lista ordenada alfabéticamente por título para respuestas estables."""
        return sorted(self.dataset.sources, key=lambda source: source.title.lower())
