"""Exposición de los perfiles de decisión disponibles (RF-001)."""

from __future__ import annotations

from dataclasses import dataclass

from atlashabita.domain.profiles import DecisionProfile
from atlashabita.infrastructure.ingestion import SeedDataset


@dataclass(frozen=True, slots=True)
class ListProfilesUseCase:
    """Devuelve los perfiles conocidos por el sistema."""

    dataset: SeedDataset

    def execute(self) -> list[DecisionProfile]:
        """Lista ordenada por identificador para respuestas estables."""
        return sorted(self.dataset.profiles, key=lambda profile: profile.id)
