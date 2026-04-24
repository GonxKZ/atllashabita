"""Resumen simple de calidad del dataset (RF-022, RF-029).

Este caso de uso sintetiza métricas volumétricas y de cobertura sin depender
de otros gates específicos. Está pensado como placeholder observable que
puede ser extendido una vez los quality gates tabulares estén disponibles.
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Any

from atlashabita.domain.territories import TerritoryKind
from atlashabita.infrastructure.ingestion import SeedDataset


@dataclass(frozen=True, slots=True)
class GetQualityReportUseCase:
    """Genera un informe de calidad con métricas básicas de cobertura."""

    dataset: SeedDataset
    data_version: str

    def execute(self) -> dict[str, Any]:
        """Construye un informe JSON-serializable con conteos por tabla."""
        observations_by_quality: Counter[str] = Counter(
            obs.quality for obs in self.dataset.observations
        )
        observations_by_indicator: Counter[str] = Counter(
            obs.indicator_code for obs in self.dataset.observations
        )
        municipalities = [
            t for t in self.dataset.territories if t.kind is TerritoryKind.MUNICIPALITY
        ]
        indicators_count = len(self.dataset.indicators)
        expected = indicators_count * len(municipalities)
        actual = len(self.dataset.observations)
        coverage_ratio = round(actual / expected, 4) if expected else 0.0

        return {
            "data_version": self.data_version,
            "tables": {
                "territories": len(self.dataset.territories),
                "autonomous_communities": self._count(TerritoryKind.AUTONOMOUS_COMMUNITY),
                "provinces": self._count(TerritoryKind.PROVINCE),
                "municipalities": len(municipalities),
                "sources": len(self.dataset.sources),
                "indicators": indicators_count,
                "observations": actual,
                "profiles": len(self.dataset.profiles),
            },
            "observations_by_quality": dict(observations_by_quality),
            "observations_by_indicator": dict(observations_by_indicator),
            "coverage": {
                "expected_observations": expected,
                "actual_observations": actual,
                "ratio": coverage_ratio,
            },
            "warnings": self._build_warnings(
                observations_by_indicator,
                municipalities_count=len(municipalities),
            ),
        }

    def _count(self, kind: TerritoryKind) -> int:
        return sum(1 for t in self.dataset.territories if t.kind is kind)

    def _build_warnings(
        self,
        observations_by_indicator: Counter[str],
        municipalities_count: int,
    ) -> list[str]:
        warnings: list[str] = []
        for indicator in self.dataset.indicators:
            count = observations_by_indicator.get(indicator.code, 0)
            if municipalities_count and count < municipalities_count:
                warnings.append(
                    f"Indicador {indicator.code} cubre {count}/{municipalities_count} municipios."
                )
        return warnings
