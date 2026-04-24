"""Catálogo de capas cartográficas disponibles (RF-026, RF-027)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from atlashabita.domain.indicators import IndicatorDirection
from atlashabita.infrastructure.ingestion import SeedDataset

_SCORE_DOMAIN: tuple[float, float] = (0.0, 100.0)
_SCORE_RANGE: tuple[str, str, str] = ("#f7fbff", "#6baed6", "#08306b")
_INDICATOR_RANGE_HIGHER: tuple[str, str, str] = ("#fee5d9", "#fcae91", "#de2d26")
_INDICATOR_RANGE_LOWER: tuple[str, str, str] = ("#edf8e9", "#74c476", "#006d2c")


@dataclass(frozen=True, slots=True)
class ListMapLayersUseCase:
    """Enumera capas disponibles: un score por perfil y un indicador por capa."""

    dataset: SeedDataset

    def execute(self) -> list[dict[str, Any]]:
        """Capas de mapa JSON-serializables con leyenda y dominio."""
        layers: list[dict[str, Any]] = []
        for profile in sorted(self.dataset.profiles, key=lambda item: item.id):
            layers.append(
                {
                    "id": f"score_{profile.id}",
                    "label": f"Score {profile.label}",
                    "type": "choropleth",
                    "legend": f"Score explicable del perfil {profile.label}",
                    "domain": list(_SCORE_DOMAIN),
                    "range": list(_SCORE_RANGE),
                    "kind": "score",
                    "profile": profile.id,
                }
            )
        for indicator in sorted(self.dataset.indicators, key=lambda item: item.code):
            domain = self._indicator_domain(indicator.code)
            palette = (
                _INDICATOR_RANGE_HIGHER
                if indicator.direction is IndicatorDirection.HIGHER_IS_BETTER
                else _INDICATOR_RANGE_LOWER
            )
            layers.append(
                {
                    "id": indicator.code,
                    "label": indicator.label,
                    "type": "choropleth",
                    "legend": f"{indicator.label} ({indicator.unit})",
                    "domain": list(domain),
                    "range": list(palette),
                    "kind": "indicator",
                    "unit": indicator.unit,
                    "direction": indicator.direction.value,
                }
            )
        return layers

    def _indicator_domain(self, indicator_code: str) -> tuple[float, float]:
        indicators = {indicator.code: indicator for indicator in self.dataset.indicators}
        indicator = indicators[indicator_code]
        if indicator.min_value is not None and indicator.max_value is not None:
            return (indicator.min_value, indicator.max_value)
        values = [
            obs.value for obs in self.dataset.observations if obs.indicator_code == indicator_code
        ]
        if not values:
            return (0.0, 1.0)
        return (min(values), max(values))
