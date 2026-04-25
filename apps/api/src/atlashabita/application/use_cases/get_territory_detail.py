"""Ficha territorial con indicadores, jerarquía y scores por perfil (RF-006, RF-031)."""

from __future__ import annotations

from dataclasses import dataclass
from functools import cached_property
from typing import Any

from atlashabita.application.scoring import ScoringService
from atlashabita.domain.territories import Territory, TerritoryKind
from atlashabita.infrastructure.ingestion import SeedDataset
from atlashabita.observability.errors import TerritoryNotFoundError


@dataclass(frozen=True)
class GetTerritoryDetailUseCase:
    """Construye la vista detallada de un territorio.

    El dataclass es ``frozen`` para que el caso de uso sea inmutable y se
    pueda compartir entre peticiones sin sorpresas. Se omite ``slots=True``
    porque :func:`functools.cached_property` necesita el ``__dict__`` de la
    instancia para almacenar el resultado memoizado; el coste extra (un dict
    ligero) es despreciable frente al ahorro de O(n) por petición que aporta
    el índice ``_territories_by_code``.
    """

    dataset: SeedDataset
    scoring_service: ScoringService

    @cached_property
    def _territories_by_code(self) -> dict[tuple[TerritoryKind, str], Territory]:
        """Índice ``(kind, code) -> Territory`` para lookup O(1) de jerarquía.

        Se construye una vez y se reutiliza en todas las llamadas a
        ``execute``: la ficha territorial recupera la provincia y comunidad por
        código administrativo, lo que antes implicaba un O(n) por cada
        territorio renderizado.
        """
        return {(t.kind, t.code): t for t in self.dataset.territories}

    @cached_property
    def _indicators_by_code(self) -> dict[str, Any]:
        """Índice ``code -> Indicator`` para evitar reconstruirlo por cada ficha."""
        return {indicator.code: indicator for indicator in self.dataset.indicators}

    def execute(self, territory_id: str) -> dict[str, Any]:
        """Devuelve la ficha territorial serializable.

        Args:
            territory_id: identificador público (``kind:code``).

        Returns:
            Diccionario con datos territoriales, jerarquía, indicadores y
            scores por perfil.

        Raises:
            TerritoryNotFoundError: si el territorio no existe.
        """
        territory = self.dataset.get_territory(territory_id)
        if territory is None:
            raise TerritoryNotFoundError(territory_id)

        indicators = self._collect_indicators(territory_id)
        scores = self._collect_scores(territory)
        return {
            "id": territory.identifier,
            "code": territory.code,
            "name": territory.name,
            "type": territory.kind.value,
            "hierarchy": self._hierarchy(territory),
            "centroid": self._centroid(territory),
            "population": territory.population,
            "area_km2": territory.area_km2,
            "indicators": indicators,
            "scores": scores,
        }

    def _hierarchy(self, territory: Territory) -> dict[str, str | None]:
        province = self._find_by_code(territory.province_code, TerritoryKind.PROVINCE)
        community = self._find_by_code(
            territory.autonomous_community_code, TerritoryKind.AUTONOMOUS_COMMUNITY
        )
        return {
            "province": province.name if province else None,
            "province_code": territory.province_code,
            "autonomous_community": community.name if community else None,
            "autonomous_community_code": territory.autonomous_community_code,
        }

    def _centroid(self, territory: Territory) -> dict[str, float] | None:
        if territory.centroid is None:
            return None
        return {"lat": territory.centroid.lat, "lon": territory.centroid.lon}

    def _find_by_code(self, code: str | None, kind: TerritoryKind) -> Territory | None:
        if code is None:
            return None
        # Lookup O(1) sobre el índice memoizado en lugar del antiguo O(n) que
        # recorría ``self.dataset.territories`` por cada llamada.
        return self._territories_by_code.get((kind, code))

    def _collect_indicators(self, territory_id: str) -> list[dict[str, Any]]:
        indicators_by_code = self._indicators_by_code
        observations = sorted(
            (obs for obs in self.dataset.observations if obs.territory_id == territory_id),
            key=lambda obs: obs.indicator_code,
        )
        rows: list[dict[str, Any]] = []
        for obs in observations:
            indicator = indicators_by_code.get(obs.indicator_code)
            if indicator is None:
                continue
            rows.append(
                {
                    "id": indicator.code,
                    "label": indicator.label,
                    "unit": indicator.unit,
                    "direction": indicator.direction.value,
                    "value": obs.value,
                    "period": obs.period,
                    "source_id": obs.source_id,
                    "quality": obs.quality,
                }
            )
        return rows

    def _collect_scores(self, territory: Territory) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        for profile in self.dataset.profiles:
            results = self.scoring_service.compute(profile.id, scope=(territory,))
            if not results:
                continue
            result = results[0]
            rows.append(
                {
                    "profile": profile.id,
                    "profile_label": profile.label,
                    "score": result.score,
                    "confidence": result.confidence,
                    "highlights": list(result.highlights),
                    "warnings": list(result.warnings),
                    "version": result.version,
                }
            )
        return rows
