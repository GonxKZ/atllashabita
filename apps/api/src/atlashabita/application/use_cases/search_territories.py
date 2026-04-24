"""Búsqueda de territorios por nombre tolerante a tildes y mayúsculas (RF-024)."""

from __future__ import annotations

import unicodedata
from dataclasses import dataclass

from atlashabita.domain.territories import Territory
from atlashabita.infrastructure.ingestion import SeedDataset


@dataclass(frozen=True, slots=True)
class SearchTerritoriesUseCase:
    """Caso de uso de búsqueda textual de territorios."""

    dataset: SeedDataset

    def execute(self, query: str, limit: int = 20) -> list[Territory]:
        """Busca territorios cuyo nombre o alias coincida con la consulta.

        Args:
            query: texto introducido por el usuario.
            limit: número máximo de resultados a devolver.

        Returns:
            Lista de territorios ordenada por prioridad: coincidencia exacta,
            prefijo y luego subcadena. Si ``query`` está vacía devuelve ``[]``.
        """
        normalized_query = _normalize(query)
        if not normalized_query:
            return []
        bounded_limit = max(1, min(int(limit), len(self.dataset.territories)))

        exact: list[Territory] = []
        prefix: list[Territory] = []
        contains: list[Territory] = []

        for territory in self.dataset.territories:
            name_normalized = _normalize(territory.name)
            aliases_normalized = tuple(_normalize(alias) for alias in territory.aliases)
            if name_normalized == normalized_query or normalized_query in aliases_normalized:
                exact.append(territory)
            elif name_normalized.startswith(normalized_query) or any(
                alias.startswith(normalized_query) for alias in aliases_normalized
            ):
                prefix.append(territory)
            elif normalized_query in name_normalized or any(
                normalized_query in alias for alias in aliases_normalized
            ):
                contains.append(territory)

        ordered: list[Territory] = [*exact, *prefix, *contains]
        return ordered[:bounded_limit]


def _normalize(text: str) -> str:
    """Normaliza texto eliminando tildes y uniformando a minúsculas."""
    decomposed = unicodedata.normalize("NFKD", text)
    without_marks = "".join(char for char in decomposed if not unicodedata.combining(char))
    return without_marks.strip().lower()
